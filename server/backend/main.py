import os
import uvicorn
import shutil

from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel

import classifier.predict as class_pred
import contact.sms_sender as sms_sender
#from backend.classifier.predict import predict_amb
from transcribe import transcribeOffline
app = FastAPI()
TEMP_UPLOAD_DIR = "temp_uploads"

#כשהמצב הוא לא פיתוח אז לעשות בקומנד
#set ENVIRONMENT=production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development") 

if ENVIRONMENT == "production":
    origins = [
        "https://myproductiondomain.com",
    ]
    allow_methods = ["GET", "POST"]
    allow_headers = ["Authorization", "Content-Type"]

else:
    origins = [
        "http://localhost:3000",  
        "http://127.0.0.1:3000", 
    ]
    allow_methods = ["*"]
    allow_headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)
print("ENVIRONMENT:", ENVIRONMENT)
print("CORS origins:", origins)

class RequestBody(BaseModel):
    history: list[str]
    ambulance_flag: Optional[bool] = False
class Location(BaseModel):
    lat: float
    lng: float
    message: Optional[str] = "First-aid emergency reported."


@app.post('/predict')
async def predict(request_body: RequestBody):
    try:

        print("Received predict request with body:", request_body)

        history = request_body.history
        if not history or not history[-1].strip():
            print("Error: Empty history")
            raise HTTPException(status_code=400, detail='Missing message in history')

        latest_msg = history[-1]
        print("Latest message:", latest_msg)

        prediction = class_pred.predict_text(latest_msg)
        print("Prediction:", prediction)

        if prediction is None or "label" not in prediction:
            print("Error: Prediction returned None")
            raise HTTPException(status_code=500, detail='Prediction failed')
        label=prediction["label"]
        has_decision=prediction["has_decision"]
        if not request_body.ambulance_flag:
            ambulance_flag=class_pred.predict_amb(latest_msg)
        else:
            ambulance_flag = request_body.ambulance_flag
        print("Ambulance flag:", ambulance_flag)
        return {"result": label,
                "has_decision": has_decision,
                "ambulance_flag":ambulance_flag
                }
    except Exception as e:
        print("Prediction error:", e)
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")



# @app.post('/audio')
# async def process_audio(audio: UploadFile = File(...)):
#     print("iiiiiiiiiii")
#     try:
#         print(f"התקבל קובץ אודיו: {audio.filename}, סוג תוכן: {audio.content_type}")
#
#         # יצירת תיקייה זמנית אם היא לא קיימת
#         if not os.path.exists(TEMP_UPLOAD_DIR):
#             os.makedirs(TEMP_UPLOAD_DIR)
#
#         # יצירת שם קובץ ייחודי באמצעות חותמת זמן למניעת התנגשויות
#         import time
#         timestamp = int(time.time())
#         original_filename = f"{timestamp}_{audio.filename or 'recording'}"
#         original_path = os.path.join(TEMP_UPLOAD_DIR, original_filename)
#
#         print(f"שומר קובץ שהועלה אל: {original_path}")
#
#         # שמירת הקובץ שהועלה
#         content = await audio.read()
#         with open(original_path, "wb") as f:
#             f.write(content)
#
#         print(f"הקובץ נשמר, גודל: {len(content)} בייטים")
#
#         # המרה לפורמט wav לצורך תמלול
#         wav_path = os.path.splitext(original_path)[0] + ".wav"
#         print(f"ממיר ל-WAV: {wav_path}")
#
#         transcribeOffline.convert_format(original_path, wav_path)
#         print("ההמרה הושלמה, מתחיל תמלול")
#
#         transcript = transcribeOffline.transcribe_audio(wav_path)
#         print(f"התמלול הושלם: {transcript}")
#
#         # קבלת תחזית מהתמליל
#         prediction = class_pred.predict_text(transcript)
#         print(f"תחזית: {prediction}")
#
#         # ניקוי קבצים זמניים
#         try:
#             if os.path.exists(original_path):
#                 os.remove(original_path)
#             if os.path.exists(wav_path):
#                 os.remove(wav_path)
#             print("קבצים זמניים הוסרו")
#         except Exception as cleanup_error:
#             print(f"שגיאה בהסרת קבצים זמניים: {cleanup_error}")
#
#         return {
#             "transcript": transcript,
#             "result": prediction
#         }
#
#     except Exception as e:
#         import traceback
#         error_details = traceback.format_exc()
#         print(f"שגיאה בעיבוד אודיו: {e}")
#         print(error_details)
#         raise HTTPException(status_code=500, detail=f"עיבוד האודיו נכשל: {str(e)}")

@app.post("/audio")
async def receive_audio(audio: UploadFile = File(...)):
    print("hh2", flush=True)

    # print("jfdjfddddddddddd")
    # # שמירת הקובץ עם השם המקורי (או שם קבוע אחר)
    # file_location = f"recordings/{audio.filename}"
    # with open(file_location, "wb") as buffer:
    #     shutil.copyfileobj(audio.file, buffer)
    # return {"message": "Audio saved successfully", "filename": audio.filename}
    print("קיבלתי את הקובץ:", audio.filename)
    return {"status": "ok", "filename": audio.filename}

@app.post("/send_sms")
async def send_sms(location:Location):
    try:
        sid=sms_sender(location.lat, location.lng,location.message)
        return {"status": "SMS sent successfully", "sid": sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
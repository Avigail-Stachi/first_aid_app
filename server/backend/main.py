import os
import uvicorn
import time
import shutil

from typing import Optional
from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pooch.utils import unique_file_name
from pydantic import BaseModel

import classifier.predict as class_pred
import contact.sms_sender as sms_sender
import transcribe.transcribeOffline as transcribeOffline
import classifier.predict_photo as class_pred_photo
# from typing import Dict

app = FastAPI()


TEMP_UPLOAD_DIR = "temp_uploads"
UPLOAD_DIR = "uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
        if has_decision:
            if label.lower() == "burns":
                print("Burns case detected. Waiting for image before ambulance decision.")
                ambulance_flag = False
                label += " (awaiting image for severity assessment)"
            else:
                ambulance_flag = (
                    request_body.ambulance_flag or
                    class_pred.predict_amb(latest_msg)
                )
        else:
            ambulance_flag = False

        print("Ambulance flag:", ambulance_flag)
        return {"result": label,
                "has_decision": has_decision,
                "ambulance_flag":ambulance_flag
                }
    except Exception as e:
        print("Prediction error:", e)
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/location")
async def receive_location(location: Location):
    print("Received location:", location)
    return {"message": "Location received", "lat": location.lat, "lng": location.lng}

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
    if not os.path.exists(TEMP_UPLOAD_DIR):
        os.makedirs(TEMP_UPLOAD_DIR)

    try:
        # שמירת הקובץ המקורי
        timestamp = int(time.time())
        filename = f"{timestamp}_{audio.filename or 'recording'}"
        input_path = os.path.join(TEMP_UPLOAD_DIR, filename)

        content = await audio.read()
        with open(input_path, "wb") as f:
            f.write(content)

        # יצירת נתיב wav
        wav_path = os.path.splitext(input_path)[0] + ".wav"

        # המרת פורמט
        transcribeOffline.convert_format(input_path, wav_path)

        # תמלול
        transcript = transcribeOffline.transcribe_audio(wav_path)
        if not transcript.strip():
            raise HTTPException(status_code=400, detail="Empty audio transcript. Please speak clearly.")

        # חיזוי לפי הטקסט
        prediction = class_pred.predict_text(transcript)

        # ניקוי קבצים
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

        return {
            "transcript": transcript,
            "result": prediction
        }
    except Exception as e:
        print(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@app.post("/send_sms")
async def send_sms(location:Location):
    try:
        sid=sms_sender(location.lat, location.lng,location.message)
        return {"status": "SMS sent successfully", "sid": sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")
#
# @app.post("/upload-image")
# async def upload_image(image: UploadFile = File(...)):
#     try:
#         if not image.filename.lower().endswith((".jpg", ".jpeg", ".png")):
#             raise HTTPException(status_code=400, detail="Unsupported image format.")
#
#         upload_dir = "uploads"
#         os.makedirs(upload_dir, exist_ok=True)  # ודא שהתיקייה קיימת
#
#         unique_filename=f"{int(time.time())}_{image.filename}"
#         file_location = os.path.join(upload_dir, unique_filename)
#         with open(file_location, "wb") as buffer:
#             shutil.copyfileobj(image.file, buffer)
#         predicted_class_idx, confidence, uncertainty = class_pred_photo.predict_with_uncertainty(file_location)
#
#         burn_classes = {
#             0: "First-degree burn",
#             1: "Second-degree burn",
#             2: "Third-degree burn"
#         }
#
#         burn_label = burn_classes.get(predicted_class_idx, "Unknown")
#         return {
#             "status":"success",
#             "filename": image.filename,
#             "prediction": burn_label,
#             "confidence": round(float(confidence), 4),
#             "uncertainty_gap": round(float(uncertainty), 4)
#         }
#     except Exception as e:
#         print(f"Error processing image: {e}")
#         raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
@app.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    try:
        if not image.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Unsupported image format.")

        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)  # ודא שהתיקייה קיימת

        unique_filename = f"{int(time.time())}_{image.filename}"
        file_location = os.path.join(upload_dir, unique_filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        prediction = class_pred_photo.predict_multi_label(file_location, threshold=0.5)

        class_names = {
            0: "First-degree burn",
            1: "Second-degree burn",
            2: "Third-degree burn",
        }

        positive_classes_names = [class_names.get(idx, f"Class_{idx}") for idx in prediction["positive_classes"]]

        return {
            "status": "success",
            "filename": image.filename,
            "positive_classes_idx": prediction["positive_classes"],
            "positive_classes_names": positive_classes_names,
            "all_probabilities": [round(float(p), 4) for p in prediction["all_probabilities"]],
            "uncertainty_gap": round(float(prediction["uncertainty_gap"]), 4)
        }
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


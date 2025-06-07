import os
import uvicorn
import time
import shutil
import base64

from typing import Optional, List

#from debugpy.common.log import warning
from fastapi import FastAPI, Request, HTTPException, File, UploadFile,Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
#from pooch.utils import unique_file_name
from pydantic import BaseModel

import classifier.predict as class_pred
import contact.sms_sender as sms_sender
import transcribe.transcribeOffline as transcribeOffline
#import classifier.predict_photo as class_pred_photo
from data.traet.treatment_db_manager import get_treatment_data
import classifier.infer_burn_degree_faster as predict_with_faster
# from typing import Dict

app = FastAPI()


TEMP_UPLOAD_DIR = "temp_uploads"
UPLOAD_DIR = "uploads"
PREDICTED_IMAGES_DIR = "predicted_images"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PREDICTED_IMAGES_DIR, exist_ok=True)

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

try:
    predict_with_faster.load_inference_model()
    print("Faster inference model loaded successfully.")
except (FileNotFoundError, RuntimeError) as e:
    print(f"Critical error loading faster inference model: {e}")
    exit()


class RequestBody(BaseModel):
    history: list[str]
    ambulance_flag: Optional[bool] = False

class Coords(BaseModel):
    lat: float
    lng: float
class Location(BaseModel):
    coords: Coords
    history: Optional[list[str]] = []
    prediction: Optional[str] = "No diagnosis provided."
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

    lat = location.coords.lat
    lng = location.coords.lng
    message = location.message or "First-aid emergency reported."
    diagnosis = location.prediction or "No diagnosis provided."
    result = sms_sender.send_emergency_sms(lat, lng, message, diagnosis)

    if result["status"] == "success":
        return {
                "status": "success",
                "message": result["message"],
                "sid": result["sid"],
                "sent_message": result["sent_message"]
            }
    elif result["status"] == "dev_mode":
        return {
                "status": "dev_mode",
                "message": result["message"],
                "sent_message": result["sent_message"]
            }
    else:  # failure
        raise HTTPException(status_code=500, detail={
            "status": "failure",
            "error": result["error"],
            "suggestion": result["suggestion"],
            "manual_message": result["manual_message"],
            "technical_details": result["technical_details"]
        })




@app.post('/upload-burn-image-faster')
async def upload_burn_image_faster(image: UploadFile = File(...)):
    try:
        if not image.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Unsupported image format.")

        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{image.filename}"
        file_location = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        detected_objects, output_image_path = predict_with_faster.predict_on_image(file_location, PREDICTED_IMAGES_DIR,
                                                                                   score_threshold=0.4)

        if os.path.exists(file_location):
            os.remove(file_location)

        burn_degrees_detected = sorted(list(set([obj['label'] for obj in detected_objects])))
        result_message =""
        has_decision_after_image = False
        warning= None

        if not burn_degrees_detected:
            warning = "⚠️ לא זוהתה כוויה בביטחון מספק. אנא נסה תמונה נוספת או תאר את הפציעה."
            result_message = "burns (awaiting image for severity assessment)"
        elif len(burn_degrees_detected) == 1:
            degree_str = burn_degrees_detected[0].replace('degree_', '')
            result_message = f"burns (degree {degree_str})"
            has_decision_after_image = True
        else:
            degrees_formatted = ", ".join([d.replace('degree_', '') for d in burn_degrees_detected])
            result_message = f"burns (degrees {degrees_formatted})"
            warning = "⚠️ זוהו מספר סוגי כוויות. הטיפול עשוי להשתנות."
            has_decision_after_image = True

        with open(output_image_path, "rb") as img_file:
            encoded_image_string = base64.b64encode(img_file.read()).decode('utf-8')

        if os.path.exists(output_image_path):
            os.remove(output_image_path)

        return {
            "status": "success",
            "filename": image.filename,
            "detected_objects": detected_objects,
            "result": result_message,
            "has_decision": has_decision_after_image,
            "warning": warning,
            "predicted_image_base64": encoded_image_string
        }

    except Exception as e:
        print(f"שגיאה בעיבוד תמונה עם Faster R-CNN: {e}")
        raise HTTPException(status_code=500, detail=f"שגיאה בעיבוד התמונה: {str(e)}")


@app.get("/treatment")
async def get_treatment(
        case_type: str = Query(..., description="Type of emergency case"),
        count: int = Query(..., ge=0, le=3, description="0=short, 1=detailed, 2=image, 3=video"),
        degrees: Optional[str] = Query(None, description="Comma-separated list of severity degrees (e.g., '1', '1,2')"),
        degree: Optional[int] = Query(None,
                                      description="Severity degree (e.g., 1, 2, 3) for non-burn cases or single burn degree")
):
    try:
        if case_type.lower() == "burns" and degrees:
            degrees_list = [d.strip() for d in degrees.split(',') if d.strip()]
            result_data = get_treatment_data(case_type, count, degrees=degrees_list)
        elif case_type.lower() != "burns" and degree is not None:
            result_data = get_treatment_data(case_type, count, degree=degree)
        else:
            result_data = get_treatment_data(case_type, count)

        if result_data is None:
            result_data = []

        formatted_results = []
        for item in result_data:


            formatted_item = {
                "case_type": item.get("case_type"),
                "degree": item.get("degree"),
                "short_instruction": item.get("short_instruction"),
                "detailed_instruction": item.get("detailed_instruction"),
                "image_url": item.get("image_url"),
                "video_url": item.get("video_url")
            }
            formatted_results.append(formatted_item)


        if len(formatted_results) == 1 and (count == 2 or count == 3):
            item = formatted_results[0]
            file_path = None
            if count == 2:
                file_path = item.get("image_url")
            elif count == 3:
                file_path = item.get("video_url")

            if file_path and os.path.exists(file_path):
                media_type = "application/octet-stream"
                if file_path.lower().endswith((".jpg", ".jpeg")):
                    media_type = "image/jpeg"
                elif file_path.lower().endswith((".png")):
                    media_type = "image/png"
                elif file_path.lower().endswith((".gif")):
                    media_type = "image/gif"
                elif file_path.lower().endswith((".mp4")):
                    media_type = "video/mp4"
                elif file_path.lower().endswith((".mov")):
                    media_type = "video/quicktime"
                elif file_path.lower().endswith((".webm")):
                    media_type = "video/webm"
                return FileResponse(path=file_path, media_type=media_type)
            return {"result": formatted_results}

        return {"result": formatted_results}

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"שגיאת שרת ב-/treatment: {e}")
        raise HTTPException(status_code=500, detail=f"שגיאת שרת: {str(e)}")


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
# @app.post("/upload-image")
# async def upload_image(image: UploadFile = File(...)):
#     try:
#         if not image.filename.lower().endswith((".jpg", ".jpeg", ".png")):
#             raise HTTPException(status_code=400, detail="Unsupported image format.")
#
#         upload_dir = "uploads"
#         os.makedirs(upload_dir, exist_ok=True)  # ודא שהתיקייה קיימת
#
#         unique_filename = f"{int(time.time())}_{image.filename}"
#         file_location = os.path.join(upload_dir, unique_filename)
#         with open(file_location, "wb") as buffer:
#             shutil.copyfileobj(image.file, buffer)
#
#         prediction = class_pred_photo.predict_multi_label(file_location, threshold=0.4)
#
#         class_names = {
#             0: "First-degree burn",
#             1: "Second-degree burn",
#             2: "Third-degree burn",
#         }
#         positive_classes_idx = prediction["positive_classes"]
#         positive_classes_names = [class_names.get(idx, f"Class_{idx}") for idx in positive_classes_idx]
#         uncertainty_gap = prediction["uncertainty_gap"]
#
#         warning = None
#         has_decision_after_image = False
#         result_for_frontend = ""
#
#         if len(positive_classes_idx) == 0:
#             warning = "⚠️ No burn detected with sufficient confidence. Please try another image or describe the injury."
#             result_for_frontend = "burns (awaiting image for severity assessment)"  # נחזיר מצב של צורך בתמונה
#             has_decision_after_image = False  # עדיין לא החלטה סופית
#         elif len(positive_classes_idx) > 0 and uncertainty_gap < 0.1:  # סף נמוך יותר לאי וודאות
#             warning = "⚠️ Low confidence in classification. Try another angle or lighting."
#             result_for_frontend = "burns (awaiting image for severity assessment)"  # גם כאן, נבקש תמונה נוספת או נשאיר במצב של חוסר וודאות
#             has_decision_after_image = False  # עדיין לא החלטה סופית
#         elif len(positive_classes_idx) > 1:
#             warning = "⚠️ Multiple burn types detected. Treatment may vary."
#             result_for_frontend = f"burns (degrees {', '.join(map(str, [idx + 1 for idx in positive_classes_idx]))})"
#             has_decision_after_image = True  # זו החלטה מספקת לטיפול רב-דרגתי
#         else:  # זוהתה דרגה אחת עם מספיק ביטחון
#             result_for_frontend = f"burns (degree {positive_classes_idx[0] + 1})"
#             has_decision_after_image = True
#
#         return {
#             "status": "success",
#             "filename": image.filename,
#             "positive_classes_idx": positive_classes_idx,  # האינדקסים (0,1,2)
#             "positive_classes_names": positive_classes_names,  # שמות הדרגות (First-degree burn)
#             "all_probabilities": [round(float(p), 4) for p in prediction["all_probabilities"]],
#             "uncertainty_gap": round(float(uncertainty_gap), 4),
#             "warning": warning,
#             "result": result_for_frontend,  # התשובה הסופית של המודל (מה יופיע בצ'אט ומה ייכנס ל-treatmentParams)
#             "has_decision": has_decision_after_image  # האם זו החלטה סופית?
#         }
#
#     except Exception as e:
#         print(f"Error processing image: {e}")
#         raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
#



#
    #     positive_classes_names = [class_names.get(idx, f"Class_{idx}") for idx in prediction["positive_classes"]]
    #     warning = None
    #     if len(prediction["positive_classes"]) == 0:
    #         warning = "⚠️ No burn detected with sufficient confidence."
    #     elif len(prediction["positive_classes"]) == 1 and prediction["uncertainty_gap"] < 0.05:
    #         warning = "⚠️ Low confidence in classification. Try another angle or lighting."
    #     elif len(prediction["positive_classes"]) > 1:
    #         warning = "⚠️ Multiple burn types detected."
    #
    #     return {
    #         "status": "success",
    #         "filename": image.filename,
    #         "positive_classes_idx": prediction["positive_classes"],
    #         "positive_classes_names": positive_classes_names,
    #         "all_probabilities": [round(float(p), 4) for p in prediction["all_probabilities"]],
    #         "uncertainty_gap": round(float(prediction["uncertainty_gap"]), 4),
    #         "warning": warning
    #     }
    #     # return {
    #     #     "status": "success",
    #     #     "filename": image.filename,
    #     #     "positive_classes_idx": prediction["positive_classes"],
    #     #     "positive_classes_names": positive_classes_names,
    #     #     "all_probabilities": [round(float(p), 4) for p in prediction["all_probabilities"]],
    #     #     "uncertainty_gap": round(float(prediction["uncertainty_gap"]), 4)
    #     # }
    # except Exception as e:
    #     print(f"Error processing image: {e}")
    #     raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
# @app.get("/treatment")
# async def get_treatment(
#     case_type: str = Query(..., description="Type of emergency case"),
#     count: int = Query(..., ge=0, le=3, description="0=short, 1=detailed, 2=image, 3=video"),
#     degree: Optional[int] = Query(None, description="Severity degree (e.g., 1, 2, 3)")
# ):
#     try:
#         result = get_treatment_data(case_type, count, degree)
#         if result is None:
#             raise HTTPException(status_code=404, detail="No treatment data found")
#         return {"result": result}
#     except ValueError as ve:
#         raise HTTPException(status_code=400, detail=str(ve))
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


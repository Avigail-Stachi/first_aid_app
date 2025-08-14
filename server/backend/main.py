import os
import time
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
import traceback
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List

import classifier.predict as class_pred
import classifier.predict_photo as class_pred_photo
import classifier.infer_burn_degree_faster as predict_with_faster
import transcribe.transcribeOffline as transcribeOffline
import contact.sms_sender as sms_sender
from data.traet.treatment_db_manager import get_treatment_data

# ===== FastAPI App =====
app = FastAPI()

# ===== Folders Setup =====
TEMP_UPLOAD_DIR = "temp_uploads"
UPLOAD_DIR = "uploads"
PREDICTED_IMAGES_DIR = "predicted_images"
for folder in [TEMP_UPLOAD_DIR, UPLOAD_DIR, PREDICTED_IMAGES_DIR]:
    os.makedirs(folder, exist_ok=True)

# ===== CORS =====
# הגדרת CORS פשוטה וישירה שמאפשרת גישה מכל מקור בסביבת פיתוח
# כדי למנוע את השגיאה הקודמת.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Load Model (Faster R-CNN) =====
try:
    predict_with_faster.load_inference_model()
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

# ===== Models =====
class RequestBody(BaseModel):
    history: List[str]
    ambulance_flag: Optional[bool] = False

class Coords(BaseModel):
    lat: float
    lng: float

class Location(BaseModel):
    coords: Coords
    history: Optional[List[str]] = []
    prediction: Optional[str] = "No diagnosis provided."
    message: Optional[str] = "First-aid emergency reported."

# ===== Routes =====

@app.get("/test")
async def test():
    print("Test endpoint called!", flush=True)
    return {"message": "Server is running!"}

@app.get("/")
async def root():
    print("Root endpoint called!", flush=True)
    return {"message": "FastAPI server is running!"}

@app.post("/predict")
async def predict(request_body: RequestBody):
    try:
        history = request_body.history
        if not history or not history[-1].strip():
            raise HTTPException(status_code=400, detail="Missing message in history")

        latest_msg = history[-1]
        prediction = class_pred.predict_text(latest_msg)

        if prediction is None or "label" not in prediction:
            raise HTTPException(status_code=500, detail="Prediction failed")

        label = prediction["label"]
        has_decision = prediction["has_decision"]

        if has_decision:
            if label.lower() == "burns":
                ambulance_flag = False
                label += " (awaiting image for severity assessment)"
            else:
                ambulance_flag = request_body.ambulance_flag or class_pred.predict_amb(latest_msg)
        else:
            ambulance_flag = False

        return {
            "result": label,
            "has_decision": has_decision,
            "ambulance_flag": ambulance_flag
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/audio")
async def receive_audio(audio: UploadFile = File(...)):
    try:
        timestamp = int(time.time())
        filename = f"{timestamp}_{audio.filename}"
        input_path = os.path.join(TEMP_UPLOAD_DIR, filename)

        with open(input_path, "wb") as f:
            f.write(await audio.read())

        wav_path = os.path.splitext(input_path)[0] + ".wav"
        transcribeOffline.convert_format(input_path, wav_path)
        transcript = transcribeOffline.transcribe_audio(wav_path)

        if not transcript.strip():
            raise HTTPException(status_code=400, detail="Empty transcript")

        prediction = class_pred.predict_text(transcript)

        os.remove(input_path)
        os.remove(wav_path)

        return {"transcript": transcript, "result": prediction}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@app.post("/location")
async def receive_location(location: Location):
    return {
        "message": "Location received",
        "lat": location.coords.lat,
        "lng": location.coords.lng
    }

@app.post("/send_sms")
async def send_sms(location: Location):
    print("Received /send_sms request", flush=True)
    print(f"Location data: {location}", flush=True)
    print(f"Coords: lat={location.coords.lat}, lng={location.coords.lng}", flush=True)
    print(f"Message: {location.message}", flush=True)
    print(f"Prediction: {location.prediction}", flush=True)
    
    try:
        print("Calling sms_sender.send_emergency_sms...", flush=True)
        result = sms_sender.send_emergency_sms(
            lat=location.coords.lat,
            lng=location.coords.lng,
            message=location.message,
            diagnosis=location.prediction
        )
        print(f"send_emergency_sms returned: {result}", flush=True)
    except Exception as e:
        print(f"Error in send_sms endpoint: {e}", flush=True)
        import traceback
        print(f"Full traceback: {traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

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
    else:
        raise HTTPException(status_code=500, detail=result)

@app.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    try:
        if not image.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Unsupported image format")

        file_path = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{image.filename}")
        with open(file_path, "wb") as f:
            shutil.copyfileobj(image.file, f)

        prediction = class_pred_photo.predict_multi_label(file_path, threshold=0.4)

        class_names = {
            0: "First-degree burn",
            1: "Second-degree burn",
            2: "Third-degree burn"
        }

        idxs = prediction["positive_classes"]
        names = [class_names.get(idx, f"Class_{idx}") for idx in idxs]
        uncertainty = prediction["uncertainty_gap"]

        if not idxs:
            result_msg = "burns (awaiting image for severity assessment)"
            has_decision = False
            warning = "⚠️ No burn detected with sufficient confidence."
        elif len(idxs) > 1:
            result_msg = f"burns (degrees {', '.join(str(i+1) for i in idxs)})"
            has_decision = True
            warning = "⚠️ Multiple burn types detected. Treatment may vary."
        elif uncertainty < 0.1:
            result_msg = "burns (awaiting image for severity assessment)"
            has_decision = False
            warning = "⚠️ Low confidence in classification."
        else:
            result_msg = f"burns (degree {idxs[0]+1})"
            has_decision = True
            warning = None

        return {
            "status": "success",
            "filename": image.filename,
            "positive_classes_idx": idxs,
            "positive_classes_names": names,
            "all_probabilities": [round(float(p), 4) for p in prediction["all_probabilities"]],
            "uncertainty_gap": round(float(uncertainty), 4),
            "warning": warning,
            "result": result_msg,
            "has_decision": has_decision
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.get("/treatment")
async def get_treatment(
    case_type: str = Query(...),
    count: int = Query(..., ge=0, le=3),
    degrees: Optional[str] = Query(None),
    degree: Optional[int] = Query(None)
):
    try:
        degrees_list = [d.strip() for d in degrees.split(",")] if degrees else None
        result = await get_treatment_data(case_type, count, degrees=degrees_list, degree=degree)

        if not isinstance(result, list):
            raise HTTPException(status_code=500, detail="Unexpected DB result type")

        formatted = [{
            "id": r.get("id"),
            "case_type": r.get("case_type"),
            "degree": r.get("degree"),
            "title": r.get("title"),
            "description": r.get("description"),
            "image_url": r.get("image_url"),
            "video_url": r.get("video_url")
        } for r in result]

        return {"result": formatted}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאת שרת: {str(e)}")

# ===== Main =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
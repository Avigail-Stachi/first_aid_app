import os
import uvicorn

from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel

import classifier.predict as class_pred
from transcribe import transcribeOffline
app = FastAPI()

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

# @app.get('/echo')
# async def echo(msg: Optional[str] = None):
#     if not msg:
#         raise HTTPException(status_code=400, detail='Missing "msg" parameter')
#
#     ans = classifier.predict.predict_text(msg)
#
#     if ans is None:
#         raise HTTPException(status_code=500, detail='Prediction failed')
#
#     return {"result": ans}

@app.post('/predict')
async def predict(request_body: RequestBody):
    print(4)
    history = request_body.history
    if not history or not history[-1]:
        raise HTTPException(status_code=400, detail='Missing message in history')

    latest_msg = history[-1]
    ans = class_pred.predict_text(latest_msg)

    if ans is None:
        raise HTTPException(status_code=500, detail='Prediction failed')

    return {"result": ans}


@app.post('/audio')
async def process_audio(audio: UploadFile = File(...)):
    try:

        if not os.path.exists("temp_uploads"):
            os.makedirs("temp_uploads")

        original_path = f"temp_uploads/{audio.filename}"
        content = await audio.read()
        print(f"Received audio file '{audio.filename}' size={len(content)} bytes")
        with open(original_path, "wb") as f:
            f.write(await audio.read())
        original_path = f"temp_uploads/{audio.filename}"


        wav_path = os.path.splitext(original_path)[0] + ".wav"
        transcribeOffline.convert_format(original_path, wav_path)
        text = transcribeOffline.transcribe_audio(wav_path)

        ans = class_pred.predict_text(text)
        os.remove(original_path)
        os.remove(wav_path)
        return {
            "transcript": text,
            "result": ans
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
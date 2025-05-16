import os
import uvicorn

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel

import classifier.predict as class_pred

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
    history = request_body.history
    if not history or not history[-1]:
        raise HTTPException(status_code=400, detail='Missing message in history')

    latest_msg = history[-1]
    ans = class_pred.predict_text(latest_msg)

    if ans is None:
        raise HTTPException(status_code=500, detail='Prediction failed')

    return {"result": ans}



if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
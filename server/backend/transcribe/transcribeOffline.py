from vosk import Model, KaldiRecognizer
import wave
import json
import subprocess
from vosk import SetLogLevel
SetLogLevel(-1)
import os

BASE_DIR = os.path.dirname(__file__)
model_path_vosk = os.path.join(BASE_DIR, "vosk-model-small-en-us-0.15")
if not os.path.isdir(model_path_vosk):
    raise FileNotFoundError(f"Model folder not found: {model_path_vosk}")
model = Model(model_path_vosk)

ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"
if not os.path.isdir(model_path_vosk):
    raise FileNotFoundError(f"Model folder not found: {model_path_vosk}")

def convert_format(input_path, output_path):
    print(55)
    # ffmpeg_path = os.path.join(BASE_DIR, "..", "..", "ffmpeg", "bin", "ffmpeg.exe")
    command = [
        ffmpeg_path,
        "-loglevel", "quiet",  # רק שגיאות חזקות
        "-y",                  # overwrite בלי לשאול
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        "-sample_fmt", "s16",
        output_path
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"ffmpeg failed: {e}")
        raise

def transcribe_audio(wav_path):
    wf = wave.open(wav_path, "rb")

    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
        raise ValueError("Audio file must be mono, 16-bit, and 16000 Hz")

    rec = KaldiRecognizer(model, wf.getframerate())

    audio_data = wf.readframes(wf.getnframes())
    rec.AcceptWaveform(audio_data)

    result = json.loads(rec.FinalResult()) #ממיר למילון
    return result.get("text", "")

# model_path_vosk = r"C:\project\projectAID\mycode\vosk-model-small-en-us-0.15\vosk-model-small-en-us-0.15"



# input_path = r"C:\Users\User\Documents\Sound Recordings\Recording (3).m4a" # אפשר כל סוג
# wav_path = r"C:\project\projectAID\data\file1.wav"
# convert_format(input_path, wav_path)
# text = transcribe_audio(wav_path)
# print("Recognized text:", text)



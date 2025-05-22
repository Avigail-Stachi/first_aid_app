from twilio.rest import Client
from dotenv import load_dotenv
import os

# טוען את משתני הסביבה מהקובץ .env
load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv('account_sid')
TWILIO_AUTH_TOKEN = os.getenv('auth_token')
TWILIO_PHONE_NUMBER = '+1234567890'  # מספר Twilio שלי
MEDA_PHONE_NUMBER = '+972123456789'  # מספר מד"א לקבלת ה-SMS

ENV= os.getenv("APP_ENV", "development")  # ברירת מחדל: פיתוח

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def send_emergency_sms(lat: float, lng: float) -> str:
    message_body = f"Emergency alert received! Location: https://maps.google.com/?q={lat},{lng}"

    if ENV != "production":
        print(f"[{ENV.upper()} MODE] מיקום אותר: {message_body}")
        return f"{message_body} (לא נשלח כי זה מצב {ENV})"

    message = client.messages.create(
        body=message_body,
        from_=TWILIO_PHONE_NUMBER,
        to=MEDA_PHONE_NUMBER
    )
    return message.sid

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

def send_emergency_sms(lat: float, lng: float, user_message: str, diagnosis: str) -> str:
    message_body = (
        f"Emergency alert received!\n"
        f"Location: https://maps.google.com/?q={lat},{lng}\n"
        f"User message: {user_message}\n"
        f"App diagnosis: {diagnosis}"
    )

    if ENV != "production":
        print(f"[{ENV.upper()} MODE] SMS content (not sent):\n{message_body}")
        return f"{message_body} (not sent due to {ENV} mode)"

    message = client.messages.create(
        body=message_body,
        from_=TWILIO_PHONE_NUMBER,
        to=MEDA_PHONE_NUMBER
    )
    return message.sid


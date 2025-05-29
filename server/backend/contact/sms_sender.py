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

def send_emergency_sms(lat: float, lng: float, user_message: str, diagnosis: str) -> dict:
    message_body = (
        f"Emergency alert received!\n"
        f"Location: https://maps.google.com/?q={lat},{lng}\n"
        f"User message: {user_message}\n"
        f"App diagnosis: {diagnosis}"
    )

    if ENV != "production":
        print(f"[{ENV.upper()} MODE] SMS content (not sent):\n{message_body}")
        return {
            "status": "dev_mode",
            "message": "SMS not sent (development mode).",
            "sent_message": message_body
        }

    try:
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=MEDA_PHONE_NUMBER
        )
        return {
            "status": "success",
            "message": "Ambulance has been alerted via SMS with the location and case details.",
            "sid": message.sid,
            "sent_message": message_body
        }
    except Exception as e:
        return {
            "status": "failure",
            "error": "Failed to send SMS (possibly no internet connection).",
            "suggestion": (
                f"Please manually send the following message to MDA at {MEDA_PHONE_NUMBER} or call 101 for emergency assistance."
            ),
            "manual_message": message_body,
            "technical_details": str(e)
        }



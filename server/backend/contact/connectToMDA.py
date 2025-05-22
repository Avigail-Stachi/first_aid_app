# import os
# import argparse
# from twilio.rest import Client
# import geocoder
# import gpsd
# from geopy.geocoders import Nominatim
#
# # 1. פונקציית GPS
# def get_location_gps():
#     try:
#         gpsd.connect()
#         packet = gpsd.get_current()
#         if packet.mode >= 2 and packet.lat is not None and packet.lon is not None:
#             return [packet.lat, packet.lon]
#     except Exception:
#         pass
#     return None
#
# # 2. פונקציית GeoIP fallback
# def get_location_ip():
#     g = geocoder.ip('me')
#     if g.ok and g.latlng:
#         return g.latlng
#     return None
#
# # 3. הגדרה של GeoPy לשם reverse geocoding
# geolocator = Nominatim(user_agent="myFirstAidApp")  # exige user_agent :contentReference[oaicite:2]{index=2}
#
# # 4. פרסינג ארגומנטים
# parser = argparse.ArgumentParser(description="Send emergency SMS with location")
# parser.add_argument('--lat', type=float, help='Latitude override')
# parser.add_argument('--lng', type=float, help='Longitude override')
# args = parser.parse_args()
#
# # 5. בחירת מקור מיקום
# if args.lat is not None and args.lng is not None:
#     lat, lng = args.lat, args.lng
#     print(f"Manual override: {lat}, {lng}")
# else:
#     loc = get_location_gps()
#     if loc:
#         lat, lng = loc
#         print(f"GPS fix: {lat}, {lng}")
#     else:
#         loc = get_location_ip()
#         lat, lng = loc or (None, None)
#         print(f"IP-based: {lat}, {lng}")
#
# # 6. שימוש ב-GeoPy ל־reverse geocoding (כתובת קריאה)
# address = "Unknown location"
# try:
#     place = geolocator.reverse(f"{lat}, {lng}", exactly_one=True, timeout=10)
#     if place and place.address:
#         address = place.address
# except Exception as e:
#     print("Reverse geocode error:", e)
#
# # 7. אישור המשתמש
# print(f"Detected location: {address}")
# confirm = input("Is this your location? (y/n): ").strip().lower()
# if confirm != 'y':
#     address_input = input("Please enter your address manually: ")
#     loc_manual = geolocator.geocode(address_input, exactly_one=True, timeout=10)
#     if loc_manual:
#         lat, lng = loc_manual.latitude, loc_manual.longitude
#         address = loc_manual.address
#         print(f"Using manual address: {address} -> ({lat}, {lng})")
#
# # 8. שליחת SMS דרך Twilio
# ENV = os.getenv("APP_ENV", "development")
# client = Client(os.getenv('TWILIO_SID'), os.getenv('TWILIO_TOKEN'))
#
# text = (
#     "First-Aid Alert!\n"
#     f"Situation: unconscious person.\n"
#     f"Location: {address}\n"
#     f"Map: https://maps.google.com/?q={lat},{lng}"
# )
# to_number   = '+972527000101'
# from_number = '+17753708117'
#
# if ENV.lower() == "production":
#     msg = client.messages.create(body=text, from_=from_number, to=to_number)
#     print("SMS sent! SID:", msg.sid)
# else:
#     print("Dev mode—SMS not sent.")
#     print(f"Simulated SMS:\n{text}")







import os
import argparse
from twilio.rest import Client
import geocoder
import gpsd


#יצא לי תוצאות לא ככ מדויקות
def get_location_auto():
    g = geocoder.ip('me')
    if g.ok and g.latlng:
        return g.latlng  # מחזיר [lat, lng]
    return None
def get_location_gps():
    try:
        gpsd.connect()  # התחברות ל־gpsd :contentReference[oaicite:1]{index=1}
        packet = gpsd.get_current()  # בקשת המיקום הנוכחי :contentReference[oaicite:2]{index=2}
        lat, lng = packet.lat, packet.lon
        if lat is not None and lng is not None:
            return [lat, lng]
    except Exception:
        pass
    return None
parser = argparse.ArgumentParser(description="Send emergency SMS with automatic or manual location")
parser.add_argument('--lat', type=float, help='Latitude (manual override)')
parser.add_argument('--lng', type=float, help='Longitude (manual override)')
args = parser.parse_args()

if args.lat is not None and args.lng is not None:
    lat, lng = args.lat, args.lng
else:
    gps_loc = get_location_gps()
    if gps_loc:
        lat, lng = gps_loc
        print(f"Using GPS location: {lat}, {lng}")
    else:
        ip_loc = get_location_auto()
        if ip_loc:
            lat, lng = ip_loc
            print(f"Using IP-based location: {lat}, {lng}")
        else:
            # קלט ידני סופי
            lat = float(input("Enter latitude manually: "))
            lng = float(input("Enter longitude manually: "))

# if args.lat is not None and args.lng is not None:
#     lat, lng = args.lat, args.lng
# else:
#     auto = get_location_auto()
#     if auto:
#         lat, lng = auto
#         print(f"Using automatic location: {lat}, {lng}")
#     else:
#         # קלט ידני מהמשתמש
#         lat = float(input("Enter latitude manually: "))
#         lng = float(input("Enter longitude manually: "))
# בדיקת מצב הפעלה: "production" או "development"
ENV = os.getenv("APP_ENV", "development")  # ברירת מחדל: פיתוח
#בסיום הפיתוח לשנות ל
#ENV = "production"
#או להגדיר משתנה סביבה


from dotenv import load_dotenv

load_dotenv()  # טוען את המשתנים מהקובץ .env

twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
twilio_token = os.getenv("TWILIO_AUTH_TOKEN")

client = Client(account_sid, auth_token)

text = ("Test message from a first-aid mobile app development project.\n"
        "Emergency simulation: person unconscious.\n"
        f"Location: https://maps.google.com/?q={lat},{lng}"
)
to_number = '+972527000101'  #SMS של מדא
from_number = '+17753708117' #המספר twilio שלי


# שליחת הודעה
if ENV == "production":
    message = client.messages.create(
        body=text,
        from_=from_number,
        to=to_number
    )
    print("Message sent successfully! SID:", message.sid)
else:
    print("Development mode – SMS was not sent.")
    print("Simulated message:")
    print(f"To: {to_number}\nBody:\n{text}")


    #לסדר את המיקום שיהיה מדויק לבדוק האם הקוד מתייחס לGPS
    #להקפיץ שאלה למשתמש האם זה המיקום שלך ואם לא הכנס ידנית
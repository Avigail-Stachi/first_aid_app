import torch
import torchvision
from torchvision.models.detection.faster_rcnn import FasterRCNN_ResNet50_FPN_Weights
from torchvision.models.detection import FasterRCNN
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os
import warnings
from torchvision import transforms as T

# הסתרת אזהרות מיותרות מ-Pillow
warnings.filterwarnings("ignore", category=UserWarning, module="PIL")


MODEL_PATH = r"C:\Users\User\Projects\first_aid_app\server\backend\data\photos\best_fasterrcnn_model.pth"

DEVICE = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
print(f"משתמש ב- DEVICE: {DEVICE}")

CLASS_MAP = {
    '__background__': 0,
    'degree_1': 1,
    'degree_2': 2,
    'degree_3': 3
}
NUM_CLASSES = len(CLASS_MAP)  # = 4
REV_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}


# --- הגדרת המודל (כפי שהוגדר באימון) ---
def _create_fasterrcnn_model(num_classes):
    """
    יוצר מודל Faster R-CNN עם ארכיטקטורת ResNet50-FPN.
    זוהי פונקציית עזר פנימית שאינה מיועדת לשימוש ישיר מחוץ למודול.
    """
    model = torchvision.models.detection.fasterrcnn_resnet50_fpn(
        weights=FasterRCNN_ResNet50_FPN_Weights.COCO_V1
    )
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = torchvision.models.detection.faster_rcnn.FastRCNNPredictor(
        in_features, num_classes
    )
    return model


# --- טעינת המודל (יבוצע פעם אחת בעת ייבוא המודול) ---
# נשמור את המודל הטעון במשתנה גלובלי (או ברמת המודול)
_loaded_model = None


def load_inference_model():
    """
    טוענת את המודל המאומן. הפונקציה מבטיחה שהמודל ייטען פעם אחת בלבד.
    יש לקרוא לפונקציה זו לפני ביצוע חיזוי בפעם הראשונה.
    """
    global _loaded_model
    if _loaded_model is None:
        try:
            model = _create_fasterrcnn_model(NUM_CLASSES)
            model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            model.to(DEVICE)
            model.eval()  # חשוב להגדיר את המודל למצב הערכה
            _loaded_model = model
            print(f"המודל נטען בהצלחה מ-{MODEL_PATH} והוגדר למצב הערכה.")
        except FileNotFoundError:
            raise FileNotFoundError(f"שגיאה: קובץ המודל {MODEL_PATH} לא נמצא. אנא וודא שהקובץ קיים.")
        except Exception as e:
            raise RuntimeError(f"שגיאה בטעינת המודל: {e}")
    return _loaded_model


# --- פונקציית חיזוי על קלט חדש ---
def predict_on_image(image_path: str, score_threshold: float = 0.4):
    """
    מבצעת חיזוי על תמונה בודדת ומציגה את תיבות התוחם.
    המודל חייב להיות טעון באמצעות `load_inference_model()` לפני קריאה לפונקציה זו.

    ארגומנטים:
        image_path (str): הנתיב לקובץ התמונה שעליה יש לבצע חיזוי.
        score_threshold (float): סף הניקוד המינימלי להצגת זיהוי.

    החזר:
        list: רשימת מילונים, כאשר כל מילון מייצג אובייקט שזוהה ומכיל:
              'label' (str), 'score' (float), 'box' (list of int [xmin, ymin, xmax, ymax]).
              אם המודל לא טעון, תעלה שגיאת RuntimeError.
    """
    if _loaded_model is None:
        raise RuntimeError("המודל לא טעון. אנא קרא לפונקציה load_inference_model() תחילה.")

    img_orig = Image.open(image_path).convert("RGB")

    # טרנספורמציה לתמונה - רק ToTensor כיוון שאנו רק מפעילים חיזוי
    transform = T.Compose([T.ToTensor()])
    img_tensor = transform(img_orig).to(DEVICE)

    with torch.no_grad():
        prediction = _loaded_model([img_tensor])

    boxes = prediction[0]['boxes'].cpu().numpy()
    labels = prediction[0]['labels'].cpu().numpy()
    scores = prediction[0]['scores'].cpu().numpy()

    draw = ImageDraw.Draw(img_orig)
    # ניסיון לטעון פונט, אם לא קיים - להשתמש בפונט ברירת מחדל
    font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    try:
        if not os.path.exists(font_path):
            font = ImageFont.load_default()
        else:
            font = ImageFont.truetype(font_path, 20)
    except Exception:
        font = ImageFont.load_default()

    detected_objects = []
    for box, label, score in zip(boxes, labels, scores):
        if score > score_threshold and REV_CLASS_MAP.get(label) != '__background__':
            x_min, y_min, x_max, y_max = box.astype(int)
            label_name = REV_CLASS_MAP.get(label, "Unknown")

            draw.rectangle([(x_min, y_min), (x_max, y_max)], outline="red", width=3)
            text_to_display = f"{label_name}: {score:.2f}"

            bbox_text = draw.textbbox((x_min, y_min), text_to_display, font=font)
            text_width = bbox_text[2] - bbox_text[0]
            text_height = bbox_text[3] - bbox_text[1]

            draw.rectangle([(x_min, y_min), (x_min + text_width, y_min + text_height)], fill="white")
            draw.text((x_min, y_min), text_to_display, fill="black", font=font)

            detected_objects.append({
                "label": label_name,
                "score": float(score),
                "box": [int(x_min), int(y_min), int(x_max), int(y_max)]
            })

    # שמירת התמונה עם הזיהויים
    output_filename = os.path.basename(image_path).split('.')[0] + "_predicted.jpg"
    # ניתן לשנות את נתיב השמירה בהתאם לצורך
    output_image_path = os.path.join(os.path.dirname(image_path), output_filename)
    img_orig.save(output_image_path)
    print(f"התמונה עם הזיהויים נשמרה ב: {output_image_path}")

    return detected_objects


# דוגמא לחיזוי

try:
    load_inference_model()
    print("המודל נטען בהצלחה ומוכן לחיזוי.")
except (FileNotFoundError, RuntimeError) as e:
    print(f"שגיאה קריטית בטעינת המודל: {e}")
    exit()  # יוצא מהסקריפט אם המודל לא נטען

example_image_for_test = r"C:\Users\User\Projects\first_aid_app\server\backend\data\photos\final_burn_dataset\train\train_images\img4.jpg"

# יצירת קובץ תמונה ריק לדוגמה אם הוא לא קיים
# (רק לצורך הדגמה כדי שהקוד יעבוד גם ללא תמונה אמיתית)
if not os.path.exists(example_image_for_test):
    print(f"אזהרה: קובץ '{example_image_for_test}' לא נמצא. יוצר תמונה ריקה לדוגמה.")
    try:
        temp_img = Image.new('RGB', (640, 480), color='white')
        temp_img.save(example_image_for_test)
        print(f"נוצרה תמונת 'test_image.jpg' ריקה. שים לב: חיזוי על תמונה ריקה לא יציג תוצאות אמיתיות.")
        print("עליך להחליף אותה בתמונה אמיתית כדי לבדוק את המודל.")
    except Exception as e:
        print(f"שגיאה ביצירת תמונת דמה: {e}. אנא וודא שיש לך הרשאות כתיבה.")
        exit()

# 3. הפעלת חיזוי על התמונה לדוגמה
print(f"\nמבצע חיזוי על התמונה: {example_image_for_test}")
try:
    detections = predict_on_image(example_image_for_test, score_threshold=0.4)

    if detections:
        print("\nאובייקטים שזוהו בתמונה:")
        for det in detections:
            print(f"  מחלקה: {det['label']}, ציון: {det['score']:.2f}, תיבה: {det['box']}")
    else:
        print("\nלא זוהו אובייקטים בסף הציון הנתון בתמונה.")

    print(
        f"\nהחיזוי הסתיים. התמונה עם הזיהויים נשמרה כ- '{os.path.basename(example_image_for_test).split('.')[0]}_predicted.jpg'.")

except Exception as e:
    print(f"שגיאה בעת ביצוע החיזוי: {e}")

print("\n--- בדיקת החיזוי הסתיימה ---")
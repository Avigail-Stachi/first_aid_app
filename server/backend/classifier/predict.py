import os
import tensorflow as tf
import numpy as np
import json

# הגדרות להפחתת התראות מ-TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# נתיב מלא למודל הטקסט
MODEL_PATH = r"C:\Users\User\Projects\first_aid_app\server\backend\model\text\saved_model1.keras"
# נתיב למודל בינארי של אמבולנס
MODEL_BINARY_PATH = os.path.join(BASE_DIR, '..', 'model', 'ambulance', 'saved_model_binary.keras')

# וידוא קיומם של המודלים
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
if not os.path.exists(MODEL_BINARY_PATH):
    raise FileNotFoundError(f"Binary model file not found at {MODEL_BINARY_PATH}")

# נתיב למילון התוויות
LABEL_MAP_PATH = os.path.join(BASE_DIR, '..', 'data', 'cases.json')

# ספי ביטחון ואי וודאות
MIN_UNCERTAINTY_THRESHOLD = 0.4
UNCERTAINTY_GAP_THRESHOLD = 0.12
DECIDE_BIN_THRESHOLD = 0.5

# טעינת מיפוי תוויות
with open(LABEL_MAP_PATH, 'r', encoding='utf-8') as f:
    label_map = json.load(f)
reverse_label_map = {v: k for k, v in label_map.items()}

# טעינת מודלים
model = tf.keras.models.load_model(MODEL_PATH)
model_binary = tf.keras.models.load_model(MODEL_BINARY_PATH)


def find_second_max(probs, max_index):
    """מחפש את ההסתברות השנייה בגודלה (לא כולל max_index)"""
    second_max = 0
    second_max_idx = -1
    for i, prob in enumerate(probs):
        if i != max_index and prob > second_max:
            second_max = prob
            second_max_idx = i
    return second_max, second_max_idx


def predict_text(text: str):
    """חיזוי דרגת המקרה מהטקסט"""
    input_tensor = tf.constant([text], dtype=tf.string)
    prediction = model.predict(input_tensor)

    predicted_class_idx = int(np.argmax(prediction))
    predicted_class_name = reverse_label_map.get(predicted_class_idx, "Unknown")
    predicted_confidence = float(prediction[0][predicted_class_idx])

    # מציאת ההסתברות השנייה בגודלה ופער הביטחון
    second_max, second_max_idx = find_second_max(prediction[0], predicted_class_idx)
    confidence_gap = predicted_confidence - second_max

    # החלטה האם יש ביטחון מספק
    if predicted_confidence < MIN_UNCERTAINTY_THRESHOLD or confidence_gap < UNCERTAINTY_GAP_THRESHOLD:
        has_decision = False
        if predicted_confidence < MIN_UNCERTAINTY_THRESHOLD:
            message = "I'm not sure about the prediction. Please provide more details."
        else:
            second_class_name = reverse_label_map.get(second_max_idx, "Unknown")
            message = (
                f"I'm uncertain whether it's '{predicted_class_name}' or '{second_class_name}'. "
                "Please provide more details to help me decide better."
            )
    else:
        has_decision = True
        message = predicted_class_name

    return {
        "label": message,
        "has_decision": has_decision
    }


def predict_amb(text: str):
    """חיזוי האם יש צורך באמבולנס מהטקסט"""
    input_tensor = tf.constant([text], dtype=tf.string)
    prediction = model_binary.predict(input_tensor)[0][0]

    if prediction >= DECIDE_BIN_THRESHOLD:
        return True
    return False

# אם תרצי לבדוק:
# print(predict_text("My grandfather collapsed and isn’t breathing—what should I do"))

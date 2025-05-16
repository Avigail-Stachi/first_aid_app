import os

# הגדרות סביבה להפחתת התראות של TF וOneDNN
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
import numpy as np
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'model', 'saved_model1.keras')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LABEL_MAP_PATH = os.path.join(BASE_DIR, '..', 'data', 'cases.json')
MIN_UNCERTAINTY_THRESHOLD = 0.4   #אחוז ביטחון
UNCERTAINTY_GAP_THRESHOLD = 0.12   #פער בין תחזיות


# טעינה של מילון התוויות
with open(LABEL_MAP_PATH, 'r', encoding='utf-8') as f:
    label_map = json.load(f)
reverse_label_map = {v: k for k, v in label_map.items()}

# טעינת המודל
model = tf.keras.models.load_model(MODEL_PATH)
# model.summary()

def find_second_max(probs, max_index):
    # second_max=-float('inf')
    second_max=0
    second_max_idx = -1
    for i, prob in enumerate(probs):
        if i != max_index and prob > second_max:
            second_max = prob
            second_max_idx = i
    return second_max, second_max_idx

# פונקציית חיזוי
def predict_text(text: str):

    # הפעלת המודל על הטקסט
    input_tensor = tf.constant([text], dtype=tf.string)  #המרה של הטקסט לטנסור
    prediction = model.predict(input_tensor)

    predicted_class_idx = int(np.argmax(prediction)) # האינדקס של המחלקה שזה הכי הרבה סיכוי
    predicted_class_name = reverse_label_map.get(predicted_class_idx, "Unknown") #מה השם של התגית
    predicted_confidence = prediction[0][predicted_class_idx] #מה אחוז הביטחון

    # הצגת תוצאה
    print(f"\nSentence: {text}") #הדפסת המשפט שהוכנס לפונקציה
    print(f"Predicted class: {predicted_class_name} (index {predicted_class_idx})") #הדפסה של השם והאינדקס של הקטגוריה
    
    print("\nClass probabilities:")
    for i, prob in enumerate(prediction[0]):
        label = reverse_label_map.get(i, f"Label {i}") #הופך אינדקס לשם הקטגוריה
        print(f"{i:2d} - {label:16s}: {prob:.3f}")

    # בדיקת אי ודאות
    second_max, second_max_idx = find_second_max(prediction[0], predicted_class_idx)
    confidence_gap = predicted_confidence - second_max


    # הדפסת אחוז של התחזית ומה הפער בין 2 הראשוניפ
    print(f"\nTop prediction: {predicted_class_name} ({predicted_confidence.item():.2%})")
    print(f"Confidence gap: {confidence_gap:.3f}")

    if predicted_confidence < MIN_UNCERTAINTY_THRESHOLD or confidence_gap < UNCERTAINTY_GAP_THRESHOLD:
        if predicted_confidence < MIN_UNCERTAINTY_THRESHOLD:
            # בטחון נמוך מדי
            return "I'm not confident in the prediction. Please provide more details so I can assist better."

        elif confidence_gap < UNCERTAINTY_GAP_THRESHOLD:
            #הפרש קטן מדי
            second_class_name = reverse_label_map.get(second_max_idx, "Unknown")
            return (f"I'm uncertain whether it's '{predicted_class_name}' or '{second_class_name}'. "
                    "Please provide more details to help me decide better.")

    else:
        print("\n The model is confident in its prediction.")
        #predicted_class_idx, predicted_class_name,
        return predicted_class_name
# predict_text("My grandfather collapsed and isn’t breathing—what should I do")
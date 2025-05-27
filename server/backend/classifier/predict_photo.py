import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'model','photos', 'saved_model_photos.keras')

model_photo = load_model(MODEL_PATH)
print("Model loaded successfully from", MODEL_PATH)

def load_and_preprocess_image(img_path, target_size=(240, 240)):
    img = image.load_img(img_path, target_size=target_size)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0
    return img_array

def predict_multi_label(img_path, threshold=0.5):
    img_array = load_and_preprocess_image(img_path)
    predictions = model_photo.predict(img_array)[0]  # וקטור הסתברויות לכל הקלאסים

    positive_classes = [i for i, prob in enumerate(predictions) if prob >= threshold]
    probabilities = predictions.tolist()
    sorted_probs = np.sort(predictions)
    uncertainty_gap = float(sorted_probs[-1] - sorted_probs[-2]) if len(predictions) > 1 else 1.0

    return {
        "positive_classes": positive_classes,           # רשימת מחלקות חיוביות
        "all_probabilities": probabilities,             # כל ההסתברויות
        "uncertainty_gap": uncertainty_gap               # פער אי-וודאות
    }

#
# def predict_with_uncertainty(img_path,):
#     img_array = load_and_preprocess_image(img_path)
#     predictions = model_photo.predict(img_array)[0]
#
#     # Assuming the model outputs probabilities for each class
#     predicted_class_idx = np.argmax(predictions)
#     predicted_confidence = predictions[predicted_class_idx]
#
#     # Calculate uncertainty
#     second_max = np.partition(predictions, -2)[-2]  # Second highest probability
#     uncertainty_gap = predicted_confidence - second_max
#
#     return {
#         "predicted_class_idx": predicted_class_idx,
#         "predicted_confidence": float(predicted_confidence),
#         "uncertainty_gap": float(uncertainty_gap),
#         "all_probabilities": predictions.tolist()
#     }
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

def predict_with_uncertainty(model,img_path,):
    img_array = load_and_preprocess_image(img_path)
    predictions = model_photo.predict(img_array)

    # Assuming the model outputs probabilities for each class
    predicted_class_idx = np.argmax(predictions[0])
    predicted_confidence = predictions[0][predicted_class_idx]

    # Calculate uncertainty
    second_max = np.partition(predictions[0], -2)[-2]  # Second highest probability
    uncertainty_gap = predicted_confidence - second_max

    return predicted_class_idx, predicted_confidence, uncertainty_gap
import os
import zipfile
import shutil
import random
import xml.etree.ElementTree as ET
from PIL import Image

def extract_and_organize_data(zip_file_path, base_output_dir="burn_dataset_raw"):
    """
    פותח את קובץ ה-ZIP ומארגן את התמונות וקבצי הטקסט.
    הנחה: בתוך ה-ZIP יש תמונות וקבצי טקסט עם שמות תואמים (לדוגמה: image1.jpg, image1.txt).
    """
    if not os.path.exists(base_output_dir):
        os.makedirs(base_output_dir)

    print(f"פותח את קובץ ה-ZIP: {zip_file_path}...")
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(base_output_dir)
    print(f"הנתונים נחלצו לתיקייה: {base_output_dir}")

    image_dir = os.path.join(base_output_dir, "images")
    labels_dir = os.path.join(base_output_dir, "labels")

    os.makedirs(image_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)

    # מעבירים קבצים לתיקיות המתאימות
    # נעבור על כל הקבצים שנחלצו ונחלק אותם
    for root, _, files in os.walk(base_output_dir):
        if root == base_output_dir: # רק בתיקיית הבסיס של החילוץ
            for file_name in files:
                file_path = os.path.join(root, file_name)
                if file_name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                    shutil.move(file_path, os.path.join(image_dir, file_name))
                elif file_name.lower().endswith(('.txt')):
                    shutil.move(file_path, os.path.join(labels_dir, file_name))
    print(f"התמונות בתיקייה: {image_dir}, קבצי האנוטציה בתיקייה: {labels_dir}")
    return image_dir, labels_dir

def convert_yolo_to_pascal_voc(image_dir, labels_dir, output_annotations_dir, class_names):
    """
    ממיר קבצי אנוטציה מפורמט YOLO לפורמט Pascal VOC (קובצי XML).
    הפורמט של YOLO: class_id center_x center_y width height (נורמליזציה 0-1)
    הפורמט של VOC: xmin ymin xmax ymax (פיקסלים)
    """
    if not os.path.exists(output_annotations_dir):
        os.makedirs(output_annotations_dir)

    # מילון המרה מ-ID של דרגה לשם דרגה (כפי שהגדרת: 0=דרגה1, 1=דרגה2, 2=דרגה3)
    # שימי לב: השמות כאן חייבים להיות זהים לשמות שתגדירי ב-CLASS_MAP מאוחר יותר!
    class_id_to_name = {
        0: class_names[0], # דרגה 1
        1: class_names[1], # דרגה 2
        2: class_names[2]  # דרגה 3
    }

    image_files = [f for f in os.listdir(image_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))]
    print(f"מתחיל המרה של {len(image_files)} תמונות...")

    for image_file in image_files:
        image_path = os.path.join(image_dir, image_file)
        try:
            img = Image.open(image_path)
            img_width, img_height = img.size
        except Exception as e:
            print(f"אזהרה: לא ניתן לפתוח תמונה {image_path}, מדלג. שגיאה: {e}")
            continue

        base_name = os.path.splitext(image_file)[0]
        label_file = base_name + ".txt"
        label_path = os.path.join(labels_dir, label_file)

        if not os.path.exists(label_path):
            print(f"אזהרה: אין קובץ תווית עבור {image_file}, מדלג.")
            continue

        root = ET.Element("annotation")
        ET.SubElement(root, "folder").text = "images"
        ET.SubElement(root, "filename").text = image_file
        ET.SubElement(root, "path").text = image_path
        source = ET.SubElement(root, "source")
        ET.SubElement(source, "database").text = "Unknown"

        size = ET.SubElement(root, "size")
        ET.SubElement(size, "width").text = str(img_width)
        ET.SubElement(size, "height").text = str(img_height)
        ET.SubElement(size, "depth").text = "3"

        ET.SubElement(root, "segmented").text = "0"

        with open(label_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) != 5:
                    print(f"אזהרה: שורת תווית לא תקינה בקובץ {label_file}: '{line.strip()}', מדלג.")
                    continue

                class_id = int(parts[0])
                if class_id not in class_id_to_name:
                    print(f"אזהרה: Class ID לא מוכר ({class_id}) בקובץ {label_file}, מדלג על אובייקט זה.")
                    continue

                x_center, y_center, width_norm, height_norm = map(float, parts[1:])

                x_center_abs = x_center * img_width
                y_center_abs = y_center * img_height
                width_abs = width_norm * img_width
                height_abs = height_norm * img_height

                xmin = int(x_center_abs - (width_abs / 2))
                ymin = int(y_center_abs - (height_abs / 2))
                xmax = int(x_center_abs + (width_abs / 2))
                ymax = int(y_center_abs + (height_abs / 2))

                xmin = max(0, xmin)
                ymin = max(0, ymin)
                xmax = min(img_width, xmax)
                ymax = min(img_height, ymax)

                if xmin >= xmax or ymin >= ymax:
                    print(f"אזהרה: תיבת תוחמת לא חוקית בקובץ {label_file}, מדלג על אובייקט זה. BBox: ({xmin}, {ymin}, {xmax}, {ymax})")
                    continue

                obj = ET.SubElement(root, "object")
                ET.SubElement(obj, "name").text = class_id_to_name[class_id]
                ET.SubElement(obj, "pose").text = "Unspecified"
                ET.SubElement(obj, "truncated").text = "0"
                ET.SubElement(obj, "difficult").text = "0"
                bbox = ET.SubElement(obj, "bndbox")
                ET.SubElement(bbox, "xmin").text = str(xmin)
                ET.SubElement(bbox, "ymin").text = str(ymin)
                ET.SubElement(bbox, "xmax").text = str(xmax)
                ET.SubElement(bbox, "ymax").text = str(ymax)

        tree = ET.ElementTree(root)
        output_xml_path = os.path.join(output_annotations_dir, base_name + ".xml")
        tree.write(output_xml_path)
    print(f"המרת YOLO ל-Pascal VOC הסתיימה. קבצי XML נשמרו בתיקייה: {output_annotations_dir}")
    return output_annotations_dir

# --- הגדרות והרצה של פונקציות ההכנה ---
if __name__ == '__main__':
    # וודאי שקובץ ה-ZIP שלך נמצא באותה תיקייה כמו הסקריפט הזה
    # או ספקי נתיב מלא אליו.
    zip_file_name = "burn_levels_dataset_yolo.zip"

    base_data_dir = "burn_dataset_raw" # תיקיית ביניים לקבצים שחולצו
    image_extracted_dir = os.path.join(base_data_dir, "images")
    labels_extracted_dir = os.path.join(base_data_dir, "labels")
    annotations_xml_dir = os.path.join(base_data_dir, "annotations") # תיקייה לקבצי ה-XML החדשים

    # שמות הקלאסים (תואם למה שציינת: 0=דרגה 1, 1=דרגה 2, 2=דרגה 3)
    # ***שמות אלה חייבים להיות זהים למה שיופיע ב-CLASS_MAP בקוד האימון!***
    burn_class_names = ["degree_1", "degree_2", "degree_3"]

    print("--- מתחיל שלב 1: חילוץ וארגון נתונים ---")
    image_folder, labels_folder = extract_and_organize_data(zip_file_name, base_data_dir)
    print("\n--- מתחיל שלב 2: המרת YOLO ל-Pascal VOC ---")
    annotations_folder = convert_yolo_to_pascal_voc(image_folder, labels_folder, annotations_xml_dir, burn_class_names)
    print("\nנתונים גולמיים מוכנים בתיקייה:", base_data_dir)
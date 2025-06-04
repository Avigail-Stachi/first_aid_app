import os
import shutil
import random


def split_data(source_image_dir, source_annotation_dir, output_base_dir, train_ratio=0.8):
    """
    מחלק את התמונות וקבצי ה-XML הנלווים לתיקיות אימון ובדיקה.
    """
    # יצירת תיקיות יעד
    train_images_dir = os.path.join(output_base_dir, "train", "train_images")
    train_xmls_dir = os.path.join(output_base_dir, "train", "train_xmls")
    test_images_dir = os.path.join(output_base_dir, "test", "test_images")
    test_xmls_dir = os.path.join(output_base_dir, "test", "test_xmls")

    for d in [train_images_dir, train_xmls_dir, test_images_dir, test_xmls_dir]:
        os.makedirs(d, exist_ok=True)

    image_files = [f for f in os.listdir(source_image_dir) if
                   f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))]
    random.shuffle(image_files)  # ערבוב התמונות לפני החלוקה

    num_train = int(len(image_files) * train_ratio)
    train_files = image_files[:num_train]
    test_files = image_files[num_train:]

    print(f"סה\"כ תמונות: {len(image_files)}")
    print(f"תמונות לאימון: {len(train_files)}")
    print(f"תמונות לבדיקה: {len(test_files)}")

    # העברת קבצים לתיקיות המתאימות
    for i, file_list in enumerate([train_files, test_files]):
        target_image_dir = train_images_dir if i == 0 else test_images_dir
        target_xml_dir = train_xmls_dir if i == 0 else test_xmls_dir

        for img_file in file_list:
            base_name = os.path.splitext(img_file)[0]

            # העברת תמונה
            shutil.copy(os.path.join(source_image_dir, img_file), os.path.join(target_image_dir, img_file))

            # העברת קובץ XML תואם
            xml_file = base_name + ".xml"
            xml_source_path = os.path.join(source_annotation_dir, xml_file)
            xml_dest_path = os.path.join(target_xml_dir, xml_file)

            if os.path.exists(xml_source_path):
                shutil.copy(xml_source_path, xml_dest_path)
            else:
                print(f"אזהרה: קובץ XML לא נמצא עבור {img_file}. לא ניתן להעתיק.")

    print("חלוקת הנתונים הסתיימה.")


# --- הגדרות והרצה של פונקציית החלוקה ---
if __name__ == '__main__':
    # וודאי שהנתיבים האלה תואמים לתיקיות שנוצרו בחלק א'
    source_images_folder = "burn_dataset_raw/images"
    source_annotations_folder = "burn_dataset_raw/annotations"

    # התיקייה שבה תיווצר החלוקה הסופית של train/test
    output_final_dataset_folder = "final_burn_dataset"

    print("--- מתחיל חלוקת נתונים לאימון ובדיקה ---")
    split_data(source_images_folder, source_annotations_folder, output_final_dataset_folder, train_ratio=0.8)
    print("\nנתונים מחולקים מוכנים בתיקייה:", output_final_dataset_folder)
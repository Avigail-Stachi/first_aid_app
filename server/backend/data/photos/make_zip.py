import os
import zipfile

def zip_folder_concise(folder_path, output_zip_name):
    if not os.path.isdir(folder_path):
        print(f"Error: Folder '{folder_path}' does not exist.")
        return

    try:
        with zipfile.ZipFile(output_zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, folder_path)
                    zipf.write(file_path, arcname)
        print(f"Folder '{folder_path}' successfully zipped to '{output_zip_name}'.")
    except Exception as e:
        print(f"An error occurred during zipping: {e}")

folder_to_zip = "final_burn_dataset"
output_zip_file = "final_burn_dataset_for_colab.zip"
zip_folder_concise(folder_to_zip, output_zip_file)
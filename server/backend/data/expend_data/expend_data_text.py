import pandas as pd
import nltk
import sys  # לנתיב של EDA
from sklearn.model_selection import train_test_split
import os
INPUT_FILE = "../text/emergency_cases_clean5.csv"
# OUTPUT_FILE = "./expend_data/emergency_cases_clean5_expend_7.csv"
TRAIN_FILE = "../text/train_augmented.csv"
TEST_FILE = "../text/test.csv"

# כמה גרסאות לכל טקסט
NUM_AUG = 10
EDA_PATH = "./eda.py"
sys.path.append(os.path.dirname(EDA_PATH))

from eda import eda

# הורדת משאבי WordNet רק פעם אחת
nltk.download('wordnet')
nltk.download('omw-1.4')


def augment_text(text, num_aug=3):
    return eda(text, num_aug=num_aug)


# קריאת הדאטה והרחבה
def augment_dataset(input_file, train_file, test_file, num_aug=3, test_size=0.2, random_state=42):
    df = pd.read_csv(input_file)
    df = df[df['label'] != 'label']

    train_df, test_df = train_test_split(df, test_size=test_size, random_state=random_state,stratify=df['label'])

    augmented_rows = []

    for idx, row in train_df.iterrows():
        text = row['text']

        # הרחבת הטקסטים
        augmented_texts = augment_text(text, num_aug)

        for new_text in augmented_texts:
            augmented_row = row.copy()
            augmented_row['text'] = new_text
            augmented_rows.append(augmented_row)

    # שילוב הנתונים המקוריים + ההרחבות
    full_train_df = pd.concat([train_df, pd.DataFrame(augmented_rows)], ignore_index=True)
    full_train_df.drop_duplicates(subset='text', inplace=True)

    # שמירה לקבצים
    full_train_df.to_csv(train_file, index=False)
    test_df.to_csv(test_file, index=False)
    print(f" קובץ אימון נשמר: {train_file}")
    print(f" קובץ בדיקה נשמר: {test_file}")


# df = pd.read_csv(INPUT_FILE)
# df = df[df['label'] != 'label']
#
# print(df['label'].value_counts())
augment_dataset(INPUT_FILE, TRAIN_FILE, TEST_FILE, NUM_AUG)

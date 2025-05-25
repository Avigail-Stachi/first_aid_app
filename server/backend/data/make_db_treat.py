import sqlite3
import os

# מיקום יחסי של קובץ ה-DB
DB_PATH = "./treatments.db"

# יצירת תיקיית data אם אין
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# מיפוי המקרים ל־ID
case_mapping = {
    "cpr": 0,
    "fainting": 1,
    "drowning": 2,
    "electric_shock": 3,
    "choking": 4,
    "rabies": 5,
    "bee_sting": 6,
    "snake_bite": 7,
    "scorpion_sting": 8,
    "wounds": 9,
    "burns": 10,
    "fractures": 11
}

# בסיס כתובת מקורות מד"א
MDA_BASE = "https://www.mdais.org.il/firstaid"

def create_db(path=DB_PATH):
    # מוחק DB קיים
    if os.path.exists(path):
        os.remove(path)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    # טבלת מקורות
    cur.execute('''
        CREATE TABLE sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_type TEXT NOT NULL,
            degree INTEGER DEFAULT NULL,
            short_src TEXT NOT NULL,
            detailed_src TEXT NOT NULL,
            image_src TEXT NOT NULL,
            video_src TEXT NOT NULL
        );
    ''')
    # טבלת הוראות טיפול
    cur.execute('''
        CREATE TABLE treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_type TEXT NOT NULL,
            degree INTEGER DEFAULT NULL,
            short_instruction TEXT NOT NULL,
            detailed_instruction TEXT NOT NULL,
            image_url TEXT NOT NULL,
            video_url TEXT NOT NULL,
            source_id INTEGER NOT NULL,
            FOREIGN KEY(source_id) REFERENCES sources(id)
        );
    ''')
    conn.commit()
    conn.close()

def get_sources_data():
    rows = []
    for case in case_mapping:
        if case == "burns":
            for degree in range(3):
                rows.append({
                    "case_type": case,
                    "degree": degree,
                    "short_src": f"{MDA_BASE}/{case}/short",
                    "detailed_src": f"{MDA_BASE}/{case}/detailed",
                    "image_src": f"{MDA_BASE}/{case}/images/degree_{degree}.jpg",
                    "video_src": f"{MDA_BASE}/{case}/videos/degree_{degree}.mp4"
                })
        else:
            rows.append({
                "case_type": case,
                "degree": None,
                "short_src": f"{MDA_BASE}/{case}/short",
                "detailed_src": f"{MDA_BASE}/{case}/detailed",
                "image_src": f"{MDA_BASE}/{case}/images/{case}.jpg",
                "video_src": f"{MDA_BASE}/{case}/videos/{case}.mp4"
            })
    return rows

def get_treatments_data(sources):
    # בונה מיפוי שולחן מקורות כדי לקבל source_id
    idx = { (s["case_type"], s["degree"]): i+1 for i, s in enumerate(sources) }
    rows = []
    for case in case_mapping:
        if case == "burns":
            for degree in range(3):
                rows.append({
                    "case_type": case,
                    "degree": degree,
                    "short_instruction": f"Cool the burn under running water for 20 minutes (Degree {degree}).",
                    "detailed_instruction": f"For a degree {degree} burn, rinse the area with cool water, cover with sterile dressing. If app deems necessary, dispatch ambulance.",
                    "image_url": f"media/images/burn_degree_{degree}.jpg",
                    "video_url": f"media/videos/burn_degree_{degree}.mp4",
                    "source_id": idx[(case, degree)]
                })
        else:
            label = case.replace("_", " ")
            rows.append({
                "case_type": case,
                "degree": None,
                "short_instruction": f"How to treat {label}.",
                "detailed_instruction": f"This is a detailed first-aid guide for {label}. Stay calm and follow the steps carefully. If app deems necessary, dispatch ambulance.",
                "image_url": f"media/images/{case}.jpg",
                "video_url": f"media/videos/{case}.mp4",
                "source_id": idx[(case, None)]
            })
    return rows

def populate_db(path=DB_PATH):
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    # מילוי טבלת sources
    sources = get_sources_data()
    for s in sources:
        cur.execute('''
            INSERT INTO sources (case_type, degree, short_src, detailed_src, image_src, video_src)
            VALUES (?, ?, ?, ?, ?, ?);
        ''', (s["case_type"], s["degree"], s["short_src"], s["detailed_src"], s["image_src"], s["video_src"]))
    # מילוי טבלת treatments
    treatments = get_treatments_data(sources)
    for t in treatments:
        cur.execute('''
            INSERT INTO treatments (
                case_type, degree, short_instruction, detailed_instruction,
                image_url, video_url, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        ''', (t["case_type"], t["degree"], t["short_instruction"], t["detailed_instruction"],
              t["image_url"], t["video_url"], t["source_id"]))
    conn.commit()
    conn.close()
    print(f"Inserted {len(sources)} sources and {len(treatments)} treatments into '{path}'.")

create_db()
populate_db()

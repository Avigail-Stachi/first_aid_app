import sqlite3
import os
import json

# מיקום יחסי של קובץ ה-DB
DB_PATH = "./treatments.db"
# יצירת תיקיית data אם אין
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


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


def populate_db(sources_json_path, treatments_json_path, path=DB_PATH):
    with open(sources_json_path, 'r', encoding='utf-8') as f:
        sources = json.load(f)
    with open(treatments_json_path, 'r', encoding='utf-8') as f:
        treatments = json.load(f)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    # מילוי טבלת sources
    for s in sources:
        cur.execute('''
                INSERT INTO sources (case_type, degree, short_src, detailed_src, image_src, video_src)
                VALUES (?, ?, ?, ?, ?, ?);
            ''', (s["case_type"], s.get("degree"), s["short_src"], s["detailed_src"], s["image_src"], s["video_src"]))

        # בונים מיפוי id לפי case_type ו-degree כדי לקשר לטבלה treatments
    cur.execute("SELECT id, case_type, degree FROM sources;")
    id_map = {}
    for row in cur.fetchall():
        source_id, case_type, degree = row
        id_map[(case_type, degree)] = source_id

    for t in treatments:
        source_id = id_map.get((t["case_type"], t.get("degree")))
        if source_id is None:
            print(f"Warning: source_id not found for {t['case_type']} degree {t.get('degree')}")
            continue
        cur.execute('''
                INSERT INTO treatments (case_type, degree, short_instruction, detailed_instruction, image_url, video_url, source_id)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            ''', (t["case_type"], t.get("degree"), t["short_instruction"], t["detailed_instruction"], t["image_url"],
                  t["video_url"], source_id))

    conn.commit()
    conn.close()
    print(f"Database populated with {len(sources)} sources and {len(treatments)} treatments.")


create_db()
populate_db("./sources.json", "./treat.json")
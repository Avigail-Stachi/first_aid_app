import sqlite3


DB_PATH=r"C:\Users\User\Documents\first_aid_app\server\backend\data\traet\treatments.db"

def get_treatment_data(case_type, count, degree=None, db_path=DB_PATH):
    # מיפוי המספר לעמודה המתאימה
    column_map = {
        0: "short_instruction",
        1: "detailed_instruction",
        2: "image_url",
        3: "video_url"
    }
    if count < 0 or count > 3:
        raise ValueError("count must be between 0 and 3")
    column = column_map[count]
    conn= sqlite3.connect(db_path)
    cur = conn.cursor()

    if degree is not None:
        cur.execute(f'''
            SELECT {column} FROM treatments
            WHERE case_type = ? AND degree = ?;
        ''', (case_type, degree))
    else:
        cur.execute(f'''
            SELECT {column} FROM treatments
            WHERE case_type = ? AND degree IS NULL;
        ''', (case_type,))

    row= cur.fetchone()
    conn.close()

    return row[0] if row else None
#
# result = get_treatment_data("burns", 1, degree=2)
# if result:
#     print("תוצאה:", result)
# else:
#     print("לא נמצאה תוצאה מתאימה")

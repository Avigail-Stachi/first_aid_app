import sqlite3
from typing import Optional, List, Dict, Any

DB_PATH = r"C:\Users\User\Documents\first_aid_app\server\backend\data\traet\treatments.db"


def get_treatment_data(case_type: str, count: int, degrees: Optional[List[str]] = None, degree: Optional[int] = None,
                       db_path: str = DB_PATH) -> Optional[List[Dict[str, Any]]]:
    # מיפוי המספר לעמודה המתאימה
    column_map = {
        0: "short_instruction",
        1: "detailed_instruction",
        2: "image_url",
        3: "video_url"
    }

    if count < 0 or count > 3:
        raise ValueError("count must be between 0 and 3")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    raw_results = []
    select_columns_str = "short_instruction, detailed_instruction, image_url, video_url"

    if case_type.lower() == "burns" and degrees:
        placeholders = ','.join('?' * len(degrees))
        query = f'''
            SELECT id, case_type, degree, {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree IN ({placeholders});
        '''
        cur.execute(query, (case_type,) + tuple(int(d) for d in degrees))
        rows = cur.fetchall()
        raw_results.extend(rows)

        if not raw_results:
            cur.execute(f'''
                        SELECT id, case_type, degree, {select_columns_str} FROM treatments
                        WHERE case_type = ? AND degree IS NULL;
                    ''', (case_type,))
            general_burn_instruction_row = cur.fetchone()
            if general_burn_instruction_row:
                raw_results.append(general_burn_instruction_row)

    elif degree is not None:
        query = f'''
            SELECT id, case_type, degree, {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree = ?;
        '''
        cur.execute(query, (case_type, degree))
        row = cur.fetchone()
        if row:
            raw_results.append(row)
    else:
        query = f'''
            SELECT id, case_type, degree, {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree IS NULL;
        '''
        cur.execute(query, (case_type,))
        row = cur.fetchone()
        if row:
            raw_results.append(row)

    conn.close()

    if not raw_results:
        return None


    processed_results = []
    for row in raw_results:
        instruction_data = {
            "id": row[0],
            "case_type": row[1],
            "degree": row[2],
            "short_instruction": row[3],
            "detailed_instruction": row[4],
            "image_url": row[5],
            "video_url": row[6]
        }
        processed_results.append(instruction_data)

    return processed_results
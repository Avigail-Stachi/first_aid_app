import sqlite3
from typing import Optional, List

DB_PATH=r"C:\Users\User\Documents\first_aid_app\server\backend\data\traet\treatments.db"

def get_treatment_data(case_type: str, count: int, degrees: Optional[List[str]] = None, degree: Optional[int] = None, db_path: str = DB_PATH):
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

    results =[]
    select_columns_str = f"{column} AS instruction_text, image_url, video_url"


    if case_type.lower() == "burns" and degrees:
        placeholders = ','.join('?' * len(degrees))

        cur.execute(f'''
            SELECT id, case_type, degree, {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree IN ({placeholders});
        ''', (case_type,) + tuple(int(d) for d in degrees))

        rows = cur.fetchall()
        for row in rows:
            instruction_type = None
            if column == "image_url":
                instruction_type = "image"
            elif column == "video_url":
                instruction_type = "video"
            results.append({
                "type": instruction_type,
                "title": f"{row[1]} Degree {row[2]}" if row[2] else f"{row[1]}",
                "description": row[3],
                "image_url": row[4],
                "video_url": row[5]
            })
        if not results:
            cur.execute(f'''
                        SELECT id, case_type, degree, {select_columns_str} FROM treatments
                        WHERE case_type = ? AND degree IS NULL;
                    ''', (case_type,))
            general_burn_instruction = cur.fetchone()
            if general_burn_instruction:
                instruction_type = None
                if column == "image_url":
                    instruction_type = "image"
                elif column == "video_url":
                    instruction_type = "video"
                results.append({
                    "type": instruction_type,
                    "title": f"{general_burn_instruction[1]}" if general_burn_instruction[2] is None else f"{general_burn_instruction[1]} Degree {general_burn_instruction[2]}",
                    "description": general_burn_instruction[3],
                    "image_url": general_burn_instruction[4],
                    "video_url": general_burn_instruction[5]
                })
    elif degree is not None:
        cur.execute(f'''
                    SELECT id, case_type, degree, {select_columns_str} FROM treatments
                    WHERE case_type = ? AND degree = ?;
                ''', (case_type, degree))
        row = cur.fetchone()
        if row:
            instruction_type = None
            if column == "image_url":
                instruction_type = "image"
            elif column == "video_url":
                instruction_type = "video"
            results.append({
                "type": instruction_type,
                "title": f"{row[1]} Degree {row[2]}" if row[2] else f"{row[1]}",
                "description": row[3],
                "image_url": row[4],
                "video_url": row[5]
            })
    else:
        cur.execute(f'''
                    SELECT id, case_type, degree, {select_columns_str} FROM treatments
                    WHERE case_type = ? AND degree IS NULL;
                ''', (case_type,))
        row = cur.fetchone()
        if row:
            instruction_type = None
            if column == "image_url":
                instruction_type = "image"
            elif column == "video_url":
                instruction_type = "video"
            results.append({
                "type": instruction_type,
                "title": f"{row[1]}" if row[2] is None else f"{row[1]} Degree {row[2]}",
                "description": row[3],
                "image_url": row[4],
                "video_url": row[5]
            })

    conn.close()
    if len(results) == 1 and not (case_type.lower() == "burns" and degrees and len(degrees) > 1):
        single_result = results[0]
        if single_result["type"] == "image":
            return {"type": "image", "url": single_result["image_url"], "title": single_result["title"]}
        elif single_result["type"] == "video":
            return {"type": "video", "url": single_result["video_url"], "title": single_result["title"]}
        else:
            return single_result["description"]
    elif results: # אם יש יותר מתוצאה אחת או תוצאה בודדת מכוויות מרובות דרגות
        formatted_results = []
        for res in results:
            formatted_results.append({
                "title": res["title"],
                "description": res["description"],
                "image_url": res["image_url"],
                "video_url": res["video_url"]
            })
        return formatted_results
    else:
        return None
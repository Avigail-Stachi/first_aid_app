import sqlite3
import asyncio
from typing import Optional, List, Dict, Any

DB_PATH = r"C:\Users\User\Documents\first_aid_app\server\backend\data\traet\treatments.db"


def _get_treatment_data_sync(case_type: str, count: int, degrees: Optional[List[str]] = None,
                             degree: Optional[int] = None,
                             db_path: str = DB_PATH) -> Optional[List[Dict[str, Any]]]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    raw_results = []
    select_columns_str = "id, case_type, degree, short_instruction, detailed_instruction, image_url, video_url"

    if case_type.lower() == "burns" and degrees:
        if 'all' in [d.lower() for d in degrees]:
            return [] # Changed: Return empty list if 'all' is sent for degrees in burns
        else:
            try:
                int_degrees = [int(d) for d in degrees]
            except ValueError:
                conn.close()
                return None

            placeholders = ','.join('?' * len(int_degrees))
            query = f'''
                SELECT {select_columns_str} FROM treatments
                WHERE case_type = ? AND degree IN ({placeholders});
            '''
            cur.execute(query, (case_type,) + tuple(int_degrees))
            rows = cur.fetchall()
            raw_results.extend(rows)

    elif degree is not None:
        query = f'''
            SELECT {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree = ?;
        '''
        cur.execute(query, (case_type, degree))
        row = cur.fetchone()
        if row:
            raw_results.append(row)
        else:
            query = f'''
                SELECT {select_columns_str} FROM treatments
                WHERE case_type = ? AND degree IS NULL;
            '''
            cur.execute(query, (case_type,))
            row = cur.fetchone()
            if row:
                raw_results.append(row)
    else:
        query = f'''
            SELECT {select_columns_str} FROM treatments
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
        _id = row[0]
        _case_type = row[1]
        _degree = row[2]
        _short_instruction = row[3]
        _detailed_instruction = row[4]
        _image_url = row[5]
        _video_url = row[6]

        _title = f"{_case_type}"
        if _degree is not None:
            _title += f" Degree {_degree}"

        _description = ""
        if count == 0:
            _description = _short_instruction
        elif count == 1:
            _description = _detailed_instruction

        instruction_data = {
            "id": _id,
            "case_type": _case_type,
            "degree": _degree,
            "title": _title,
            "description": _description,
            "image_url": _image_url,
            "video_url": _video_url
        }
        processed_results.append(instruction_data)

    return processed_results


async def get_treatment_data(case_type: str, count: int, degrees: Optional[List[str]] = None,
                             degree: Optional[int] = None,
                             db_path: str = DB_PATH) -> Optional[List[Dict[str, Any]]]:
    return await asyncio.to_thread(_get_treatment_data_sync, case_type, count, degrees, degree, db_path)
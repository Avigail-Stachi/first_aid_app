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
            print(f"DEBUG: _get_treatment_data_sync: Handling 'burns' with 'degrees=all'.")
            query = f'''
                SELECT {select_columns_str} FROM treatments
                WHERE case_type = ? AND degree IS NULL;
            '''
            cur.execute(query, (case_type,))
            rows = cur.fetchall()
            raw_results.extend(rows)
        else:
            print(f"DEBUG: _get_treatment_data_sync: Handling 'burns' with specific degrees: {degrees}")
            try:
                int_degrees = [int(d) for d in degrees]
            except ValueError:
                print(
                    f"ERROR: _get_treatment_data_sync: Invalid degree value in degrees list, cannot convert to int: {degrees}")
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

            if not raw_results:
                print(
                    f"DEBUG: _get_treatment_data_sync: No specific burn degree found, trying general burn instruction (degree IS NULL).")
                cur.execute(f'''
                            SELECT {select_columns_str} FROM treatments
                            WHERE case_type = ? AND degree IS NULL;
                        ''', (case_type,))
                general_burn_instruction_row = cur.fetchone()
                if general_burn_instruction_row:
                    raw_results.append(general_burn_instruction_row)

    elif degree is not None:
        print(f"DEBUG: _get_treatment_data_sync: Handling single degree: {degree} for {case_type}.")
        query = f'''
            SELECT {select_columns_str} FROM treatments
            WHERE case_type = ? AND degree = ?;
        '''
        cur.execute(query, (case_type, degree))
        row = cur.fetchone()
        if row:
            raw_results.append(row)
        else:
            print(
                f"DEBUG: _get_treatment_data_sync: No specific degree found for {case_type} with degree {degree}, trying general instruction (degree IS NULL).")
            query = f'''
                SELECT {select_columns_str} FROM treatments
                WHERE case_type = ? AND degree IS NULL;
            '''
            cur.execute(query, (case_type,))
            row = cur.fetchone()
            if row:
                raw_results.append(row)


    else:
        print(f"DEBUG: _get_treatment_data_sync: Handling general case for {case_type} with degree IS NULL.")
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
        print("DEBUG: _get_treatment_data_sync: No raw results found in DB.")
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

    print(f"DEBUG: _get_treatment_data_sync: Returning processed results: {processed_results}")
    return processed_results


async def get_treatment_data(case_type: str, count: int, degrees: Optional[List[str]] = None,
                             degree: Optional[int] = None,
                             db_path: str = DB_PATH) -> Optional[List[Dict[str, Any]]]:
    return await asyncio.to_thread(_get_treatment_data_sync, case_type, count, degrees, degree, db_path)
import React ,{useContext} from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";

export default function ChatActions() {
  const navigate = useNavigate();
  const {
    newChat,
    treatmentParams,
  } = useContext(ChatContext);

  const handleWhatToDoClick=()=>{
    let url = `/treatment?case_type=${encodeURIComponent(
      treatmentParams.caseType
    )}`;
    // אם זה מקרה כוויה
    if (treatmentParams.caseType.toLowerCase().includes("burn")) {
      // אם זוהו דרגות מהתמונה (identifiedDegrees)
      if (
        treatmentParams.hasImageDiagnosis &&
        treatmentParams.identifiedDegrees &&
        treatmentParams.identifiedDegrees.length > 0
      ) {
        url += `&degrees=${treatmentParams.identifiedDegrees.join(",")}`;
      }
      // אם זוהה כוויה, אבל אין אבחון תמונה, או שאבחון התמונה לא זיהה דרגות כלל
      // נשלח אינדיקציה להציג את כל הדרגות (1, 2, 3)
      else {
        // המצב הזה מתרחש כאשר caseType הוא "burn", אבל
        // או שאין hasImageDiagnosis (אבחון טקסטואלי),
        // או שיש hasImageDiagnosis אבל identifiedDegrees ריק (תמונה לא זיהתה כלום).
        url += `&degrees=all`;
      }
    } else {
      // למקרים שאינם כוויה, נשלח את ה-degree אם קיים
      if (treatmentParams.degree) {
        url += `&degree=${treatmentParams.degree}`;
      }
    }

    // ה-count תמיד מתחיל מ-0 כשמגיעים לעמוד הטיפול בפעם הראשונה
    url += `&count=0`;
    navigate(url);
  };

  // לוגיקה לקביעת האם הכפתור מנוטרל
  let isDisabled = true;
  if (treatmentParams && treatmentParams.caseType) {
    if (treatmentParams.caseType.toLowerCase().includes("burn")) {
      // אם זה כוויה
      if (treatmentParams.hasImageDiagnosis) {
        // אם היה אבחון תמונה, הכפתור פעיל רק אם זוהו דרגות כלשהן
        isDisabled =
          !treatmentParams.identifiedDegrees ||
          treatmentParams.identifiedDegrees.length === 0;
      } else {
        // אם לא היה אבחון תמונה, הכפתור פעיל (נציג את כל הדרגות כברירת מחדל)
        isDisabled = false;
      }
    } else {
      // אם זה לא כוויה, הכפתור פעיל כל עוד יש caseType
      isDisabled = false;
    }
  }

  return (
    <>
      <button onClick={newChat} style={{ marginTop: "1rem" }}>
        Start New Chat
      </button>
      <button
        onClick={handleWhatToDoClick}
        disabled={isDisabled} // השתמש ב-isDisabled שחושב למעלה
        style={{
          marginLeft: "1rem",
          marginTop: "1rem",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      >
        What to do?
      </button>
    </>
  );
}
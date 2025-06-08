import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";

export default function ChatActions() {
  const navigate = useNavigate();
  const { newChat, treatmentParams } = useContext(ChatContext);
  useEffect(() => {
    console.log("ChatActions - treatmentParams updated:", treatmentParams);
    if (treatmentParams) {
      console.log("  hasImageDiagnosis:", treatmentParams.hasImageDiagnosis);
      console.log("  identifiedDegrees:", treatmentParams.identifiedDegrees);
      console.log(
        "  identifiedDegrees type:",
        typeof treatmentParams.identifiedDegrees
      );
      if (Array.isArray(treatmentParams.identifiedDegrees)) {
        console.log(
          "  identifiedDegrees length:",
          treatmentParams.identifiedDegrees.length
        );
      }
      console.log("  Server Warning:", treatmentParams.serverWarning);
      console.log(
        "  Result awaiting image:",
        treatmentParams.resultAwaitingImage
      );
      console.log(
        "   Predicted Image Base64 (exists):",
        !!treatmentParams.predictedImageBase64
      );
    }
  }, [treatmentParams]);
  const handleWhatToDoClick = () => {
    const currentCaseType =
      treatmentParams?.caseType && typeof treatmentParams.caseType === "string"
        ? treatmentParams.caseType
        : "";
    let url = `/treatment?case_type=${encodeURIComponent(currentCaseType)}`;

    // ***** התחל להחליף מפה *****
    if (currentCaseType.toLowerCase().includes("burn")) {
      const uniqueIdentifiedDegrees = Array.isArray(
        treatmentParams.identifiedDegrees
      )
        ? [...new Set(treatmentParams.identifiedDegrees)].sort((a, b) => a - b)
        : []; // תנאי 1 (עדיפות גבוהה): אם הועלתה תמונה וזוהו דרגות כלשהן // זהו המצב בעל העדיפות הגבוהה ביותר. גם אם יש serverWarning (כמו "Multiple burn types"), // אנחנו רוצים להציג את הדרגות הספציפיות שזוהו.

      if (
        treatmentParams.hasImageDiagnosis && // יש אבחון תמונה (true)
        uniqueIdentifiedDegrees.length > 0
      ) {
        // וזוהו דרגות ספציפיות (true)
        url += `&degrees=${uniqueIdentifiedDegrees.join(",")}`; // <-- זה מה שיתבצע!
      } // תנאי 2: אם אין עדיין אבחון תמונה (אבחון טקסטואלי ראשוני) // או שהשרת מבקש תמונה נוספת (resultAwaitingImage), או שיש serverWarning // מבלי שזוהו דרגות ספציפיות (כמו במקרה שהשרת לא זיהה דרגות אבל נתן אזהרה כללית). // במקרים אלו, נציג הוראות טיפול לכל 3 הדרגות.
      else if (
        !treatmentParams.hasImageDiagnosis || // אין אבחון תמונה (אבחון טקסטואלי)
        treatmentParams.resultAwaitingImage || // השרת עדיין ממתין לתמונה
        (treatmentParams.hasImageDiagnosis && // או יש אבחון תמונה אבל...
          uniqueIdentifiedDegrees.length === 0 && // ...לא זוהו דרגות
          !!treatmentParams.serverWarning)
      ) {
        // ...ויש אזהרה מהשרת (כמו "תמונה לא ברורה")
        url += `&degrees=1,2,3`;
      } // תנאי 3: הועלתה תמונה, אך לא זוהו דרגות (uniqueIdentifiedDegrees ריק) // ואין אזהרה מהשרת (כלומר, השרת פשוט לא זיהה כלום באופן ודאי). // במקרה זה, לא נשלח פרמטר degrees כלל, ונעצור את הניווט.
      else if (
        treatmentParams.hasImageDiagnosis && // יש אבחון תמונה
        uniqueIdentifiedDegrees.length === 0 && // אבל לא זוהו דרגות
        !treatmentParams.serverWarning
      ) {
        // ואין אזהרה ספציפית
        console.log(
          "No specific burn degrees identified and no warning. Remaining on chat page."
        );
        return; // עוצר את הניווט
      }
    } else {
      // למקרים שאינם כוויה, נשלח את ה-degree אם קיים
      if (treatmentParams.degree) {
        url += `&degree=${treatmentParams.degree}`;
      }
    }
    // ***** סיים להחליף פה *****

    url += `&count=0`;
    navigate(url);
  }; // הקוד של isDisabled גם צריך להיות מעודכן כפי שסופק בתשובה הקודמת

  let isDisabled = true;
  if (treatmentParams && typeof treatmentParams.caseType === "string") {
    const currentCaseTypeForDisabled = treatmentParams.caseType;

    if (currentCaseTypeForDisabled.toLowerCase().includes("burn")) {
      if (
        (treatmentParams.hasImageDiagnosis &&
          Array.isArray(treatmentParams.identifiedDegrees) &&
          treatmentParams.identifiedDegrees.length > 0) ||
        !treatmentParams.hasImageDiagnosis ||
        treatmentParams.resultAwaitingImage ||
        (treatmentParams.hasImageDiagnosis &&
          !Array.isArray(treatmentParams.identifiedDegrees) &&
          !!treatmentParams.serverWarning) ||
        (treatmentParams.hasImageDiagnosis &&
          Array.isArray(treatmentParams.identifiedDegrees) &&
          treatmentParams.identifiedDegrees.length === 0 &&
          !!treatmentParams.serverWarning)
      ) {
        isDisabled = false;
      } else {
        isDisabled = true;
      }
    } else {
      isDisabled = false;
    }
  }
  console.log("ChatActions - isDisabled state:", isDisabled);

  return (
    <>
           {" "}
      <button onClick={newChat} style={{ marginTop: "1rem" }}>
                Start New Chat      {" "}
      </button>
           {" "}
      <button
        onClick={handleWhatToDoClick}
        disabled={isDisabled}
        style={{
          marginLeft: "1rem",
          marginTop: "1rem",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      >
                What to do?      {" "}
      </button>
         {" "}
    </>
  );
}

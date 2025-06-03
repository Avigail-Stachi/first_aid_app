import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";

export default function ChatActions() {
  const navigate = useNavigate();
  const { newChat, treatmentParams } = useContext(ChatContext);
  useEffect(() => {
    console.log("ChatActions - treatmentParams updated:", treatmentParams);
    if (treatmentParams) {
      console.log("  hasImageDiagnosis:", treatmentParams.hasImageDiagnosis);
      console.log("  identifiedDegrees:", treatmentParams.identifiedDegrees);
      console.log(
        "  identifiedDegrees type:",
        typeof treatmentParams.identifiedDegrees
      );
      if (Array.isArray(treatmentParams.identifiedDegrees)) {
        console.log(
          "  identifiedDegrees length:",
          treatmentParams.identifiedDegrees.length
        );
      }
      console.log("  Server Warning:", treatmentParams.serverWarning); // נוסף!
      console.log(
        "  Result awaiting image:",
        treatmentParams.resultAwaitingImage
      ); // נוסף!
    }
  }, [treatmentParams]);
  const handleWhatToDoClick = () => {
    const currentCaseType =
      treatmentParams?.caseType && typeof treatmentParams.caseType === "string"
        ? treatmentParams.caseType
        : "";
    let url = `/treatment?case_type=${encodeURIComponent(
      currentCaseType // *** השתמשי כאן ב-currentCaseType המבוטח ***
    )}`;

    //  מפההה

    // // אם זה מקרה כוויה
    // if (currentCaseType.toLowerCase().includes("burn")) {
    //   // אם זוהו דרגות מהתמונה (identifiedDegrees)
    //   if (
    //     treatmentParams.hasImageDiagnosis &&
    //     treatmentParams.identifiedDegrees &&
    //     treatmentParams.identifiedDegrees.length > 0
    //   ) {
    //     url += `&degrees=${treatmentParams.identifiedDegrees.join(",")}`;
    //   }
    //   // אם זוהה כוויה, אבל אין אבחון תמונה, או שאבחון התמונה לא זיהה דרגות כלל
    //   // נשלח אינדיקציה להציג את כל הדרגות (1, 2, 3)
    //   else {
    //     // המצב הזה מתרחש כאשר caseType הוא "burn", אבל
    //     // או שאין hasImageDiagnosis (אבחון טקסטואלי),
    //     // או שיש hasImageDiagnosis אבל identifiedDegrees ריק (תמונה לא זיהתה כלום).
    //     url += `&degrees=all`;
    //   }
    // } else {
    //   // למקרים שאינם כוויה, נשלח את ה-degree אם קיים
    //   if (treatmentParams.degree) {
    //     url += `&degree=${treatmentParams.degree}`;
    //   }
    // }

    //לפהההה

    if (currentCaseType.toLowerCase().includes("burn")) {
      // אם בוצע אבחון תמונה ויש אזהרה (low confidence)
      // או אם ה-result מהשרת מציין שעדיין ממתינים לתמונה נוספת לאבחון חמור יותר
      // אז נשלח &degrees=all כדי להציג את הטיפול הכללי.
      // אחרת, אם זוהו דרגות בביטחון (כלומר אין אזהרה ואין "awaiting image"), נשלח את הדרגות הספציפיות.
      if (
        treatmentParams.hasImageDiagnosis &&
        (treatmentParams.serverWarning || treatmentParams.resultAwaitingImage) // <-- **השורה הזו השתנתה**
      ) {
        url += `&degrees=all`;
      }
      // אם זוהו דרגות מהתמונה (identifiedDegrees) ואין אזהרה (אבחון מוצלח)
      else if (
        treatmentParams.hasImageDiagnosis &&
        Array.isArray(treatmentParams.identifiedDegrees) &&
        treatmentParams.identifiedDegrees.length > 0
      ) {
        url += `&degrees=${treatmentParams.identifiedDegrees.join(",")}`;
      }
      // אם זה מקרה כוויה אבל ללא אבחון תמונה (אבחון טקסטואלי)
      // או אם מסיבה כלשהי identifiedDegrees ריק לחלוטין (ללא אזהרה), נשלח &degrees=all
      else {
        url += `&degrees=all`;
      }
    } else {
      if (treatmentParams.degree) {
        url += `&degree=${treatmentParams.degree}`;
      }
    }

    // ה-count תמיד מתחיל מ-0 כשמגיעים לעמוד הטיפול בפעם הראשונה
    url += `&count=0`;
    navigate(url);
  };

  // // לוגיקה לקביעת האם הכפתור מנוטרל
  // let isDisabled = true;
  // if (treatmentParams && typeof treatmentParams.caseType === "string") {
  //   const currentCaseTypeForDisabled = treatmentParams.caseType;
  //   if (currentCaseTypeForDisabled.toLowerCase().includes("burn")) {
  //     // אם זה כוויה
  //     if (treatmentParams.hasImageDiagnosis) {
  //       // אם היה אבחון תמונה, הכפתור פעיל רק אם זוהו דרגות כלשהן
  //       isDisabled =
  //         !treatmentParams.identifiedDegrees ||
  //         treatmentParams.identifiedDegrees.length === 0;
  //     } else {
  // לוגיקה לקביעת האם הכפתור מנוטרל
  let isDisabled = true;
  if (treatmentParams && typeof treatmentParams.caseType === "string") {
    const currentCaseTypeForDisabled = treatmentParams.caseType;

    if (currentCaseTypeForDisabled.toLowerCase().includes("burn")) {
      // אם זה כוויה
      // הכפתור תמיד יהיה פעיל אם יש איזשהו אבחון (תמונה או טקסט)
      isDisabled = false;
    } else {
      // אם זה לא כוויה, הכפתור פעיל כל עוד יש caseType (אבחון טקסטואלי רגיל).
      isDisabled = false;
    }
  }
  console.log("ChatActions - isDisabled state:", isDisabled);

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

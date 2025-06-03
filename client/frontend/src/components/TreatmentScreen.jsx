// import React, { useContext, useEffect, useState, useCallback } from "react";
// import { useSearchParams, useNavigate} from "react-router-dom";
// import { ChatContext } from "../context/ChatContext";
// import { speakText } from "./speech";

// const TreatmentInstructions = ({ caseType, degree, currentCount }) => {
//   const [instruction, setInstruction] = useState("Loading treatment instructions...");
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Function to fetch treatment instructions from your server
//   const fetchInstructions = useCallback(
//     async (type, deg, count) => {
//       setIsLoading(true);
//       setError(null);
//       try {
//         let url = `${process.env.REACT_APP_API_URL}/treatment?case_type=${encodeURIComponent(type)}&count=${count}`;
//         // Add degree only if it's relevant (not null or undefined)
//         if (deg !== undefined && deg !== null) {
//           url += `&degree=${deg}`;
//         }

//         const res = await fetch(url);
//         if (!res.ok) {
//           const errorData = await res.json();
//           throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
//         }
//         const data = await res.json();
//         setInstruction(data.result || "No further information available."); // The server returns in the 'result' field
//       } catch (err) {
//         console.error("Failed to fetch treatment instructions:", err);
//         setError(`Error loading treatment instructions: ${err.message}`);
//         setInstruction("An error occurred while loading information.");
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [] // Empty dependencies because the function will only change on initial render
//   );

//   useEffect(() => {
//     // Call the instruction fetching function every time one of the parameters changes
//     fetchInstructions(caseType, degree, currentCount);
//   }, [caseType, degree, currentCount, fetchInstructions]); // Dependencies for useEffect

//   if (isLoading) {
//     return <div>Loading treatment instructions...</div>;
//   }

//   if (error) {
//     return <div style={{ color: "red" }}>{error}</div>;
//   }

//   // Logic for displaying the instruction content (text, image, video)
//   if (typeof instruction === "string") {
//     return (
//       <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
//         <p style={{ flex: 1 }}>{instruction}</p>
//         {(currentCount === 0 || currentCount === 1) && ( // Read aloud button appears only for stages 0 and 1
//           <button
//             onClick={() => speakText(instruction)}
//             title="Read aloud"
//             style={{
//               background: "none",
//               border: "none",
//               cursor: "pointer",
//               fontSize: "1.2rem"
//             }}
//           >
//             🔊
//           </button>
//         )}
//       </div>
//     );
//   } else if (instruction && instruction.type === "image") {
//     return (
//       <img
//         src={instruction.url}
//         alt="treatment visual"
//         style={{ maxWidth: "100%" }}
//       />
//     );
//   } else if (instruction && instruction.type === "video") {
//     return (
//       <video controls style={{ maxWidth: "100%" }}>
//         <source src={instruction.url} type="video/mp4" />
//         Your browser does not support video.
//       </video>
//     );
//   }
//   return <p>No further information available.</p>;
// };

// export default function TreatmentScreen() {
//   const navigate = useNavigate();
//   const [searchParams, setSearchParams] = useSearchParams();
//   const { newChat } = useContext(ChatContext);

//   const initialCaseType = searchParams.get("case_type") || "";
//   const initialDegreesParam = searchParams.get("degrees"); // Can be "all" or "1,2"
//   const initialDegree = searchParams.get("degree"); // For non-burn cases (not multi-degree burns)

//   // The count is directly in the URL and we'll use searchParams to get and update it
//   const currentCount = parseInt(searchParams.get("count") || "0", 10);

//   // Logic to determine which burn degrees to display
//   const burnDegreesToShow = initialCaseType.toLowerCase().includes("burn")
//     ? initialDegreesParam === "all" // If the server didn't identify a specific degree, show all
//       ? [1, 2, 3]
//       : initialDegreesParam
//       ? initialDegreesParam.split(",").map(Number).sort((a, b) => a - b) // If specific degrees were identified, convert to numbers and sort
//       : [] // If it's a burn but no degrees parameter (edge case)
//     : []; // If it's not a burn, the list is empty

//   // Function to handle "I didn't understand" click
//   const handleNotUnderstood = useCallback(() => {
//     // Update the count parameter in the URL
//     setSearchParams((prevSearchParams) => {
//       const newCount = parseInt(prevSearchParams.get("count") || "0", 10) + 1;
//       // Ensure the count doesn't exceed the server's limit (here 3)
//       if (newCount <= 3) {
//         prevSearchParams.set("count", newCount.toString());
//       }
//       return prevSearchParams;
//     });
//   }, [setSearchParams]);

//   const handleBackToChat = () => {
//     navigate("/chat"); // Go back to the chat page (ensure this path is defined in App.js)
//   };

//   return (
//     <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", border: "1px solid #eee", borderRadius: "8px" }}>
//       <h2>Treatment Page</h2>

//       {/* Message if no diagnosis */}
//       {!initialCaseType && (
//         <p style={{ color: "gray" }}>
//           Treatment instructions cannot be provided as no diagnosis was made. Please return to the chat and describe the emergency.
//         </p>
//       )}

//       {/* If there's a caseType, display instructions */}
//       {initialCaseType && (
//         initialCaseType.toLowerCase().includes("burn") ? (
//           // Display separate components for each relevant burn degree
//           burnDegreesToShow.length > 0 ? (
//             burnDegreesToShow.map((degree) => (
//               <div key={`burn-${degree}`}>
//                 <h3>Treatment for Burn Degree {degree}</h3>
//                 <TreatmentInstructions
//                   caseType={initialCaseType}
//                   degree={degree} // Pass the specific degree to the instructions component
//                   currentCount={currentCount} // Pass the current count
//                 />
//                 {/* "I didn't understand" button is active as long as count is less than 3 (because there are stages 0,1,2,3) */}
//                 <button
//                   onClick={handleNotUnderstood}
//                   disabled={currentCount >= 3}
//                   style={{ marginTop: "0.5rem", marginBottom: "1rem" }}
//                 >
//                   I didn't understand (Next step)
//                 </button>
//               </div>
//             ))
//           ) : (
//             <p>No relevant burn degrees identified for treatment.</p>
//           )
//         ) : (
//           // Display treatment instructions for non-burn cases (only one)
//           <div>
//             <h3>Treatment for {initialCaseType}</h3>
//             <TreatmentInstructions
//               caseType={initialCaseType}
//               degree={initialDegree} // For non-burn cases
//               currentCount={currentCount}
//             />
//             {/* "I didn't understand" button is active as long as count is less than 3 (because there are stages 0,1,2,3) */}
//             <button
//               onClick={handleNotUnderstood}
//               disabled={currentCount >= 3}
//               style={{ marginTop: "0.5rem", marginBottom: "1rem" }}
//             >
//               I didn't understand (Next step)
//             </button>
//           </div>
//         )
//       )}

//       <hr style={{ margin: "2rem 0" }} />
//       <button onClick={handleBackToChat}>Back to Chat</button>
//       <button onClick={newChat} style={{ marginLeft: "1rem" }}>Start New Chat</button>
//     </div>
//   );
// }





// // export default function TreatmentScreen() {
// //   const {newChat}=useContext(ChatContext);
// //   const [data, setData] = useState(null);
// //   const [error, setError] = useState(null);
// //   const [searchParams, setSearchParams] = useSearchParams();
// //   //const navigate = useNavigate();
// //   const caseType = searchParams.get("case_type");
// //   const degree = searchParams.get("degree");
// //   const initialCount = parseInt(searchParams.get("count"), 10) || 0;
// //   const [count, setCount] = useState(initialCount);

// //   useEffect(() => {
// //     if (!caseType) return;
// //     const fetchTreatment = async () => {
// //       if (!caseType || count === undefined) return;
// //       try {
// //         const url = new URL(`${process.env.REACT_APP_API_URL}/treatment`);
// //         url.searchParams.append("case_type", caseType);
// //         url.searchParams.append("count", count);
// //         if (degree) url.searchParams.append("degree", degree);

// //         const res = await fetch(url);
// //         if (!res.ok) throw new Error("Failed to fetch");
// //         const json = await res.json();
// //         setData(json.result);
// //       } catch (err) {
// //         setError(err.message);
// //       }
// //     };
// //     fetchTreatment();
// //   }, [caseType, count, degree]);

// //   const handleDidntUnderstand = () => {
// //     if (count < 3) {
// //       const next = count + 1;
// //       setCount(next);
// //       // update URL so `count` param matches state
// //       setSearchParams((prev) => {
// //         const updated = new URLSearchParams(prev);
// //         updated.set("count", next);
// //         return updated;
// //       });
// //     }
// //   };

// //   return (
// //     <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
// //       <h2>Treatment Instructions</h2>
// //       {error && <p style={{ color: "red" }}>{error}</p>}
// //       {!error && !caseType && (
// //         <p style={{ color: "gray" }}>
// //           We cannot provide treatment instructions because no diagnosis was
// //           made. Please return to the chat and describe the emergency.
// //         </p>
// //       )}

// //       {!error && caseType && !data && <p>Loading treatment instructions...</p>}
// // {data && typeof data === "string" && (
// //   <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
// //     <p style={{ flex: 1 }}>{data}</p>
// //     {(count === 0 || count === 1) && (
// //       <button
// //         onClick={() => speakText(data)}
// //         title="Read aloud"
// //         style={{
// //           background: "none",
// //           border: "none",
// //           cursor: "pointer",
// //           fontSize: "1.2rem"
// //         }}
// //       >
// //         🔊
// //       </button>
// //     )}
// //   </div>
// // )}
// //       {data && data.type === "image" && (
// //         <img
// //           src={data.url}
// //           alt="treatment visual"
// //           style={{ maxWidth: "100%" }}
// //         />
// //       )}
// //       {data && data.type === "video" && (
// //         <video controls style={{ maxWidth: "100%" }}>
// //           <source src={data.url} type="video/mp4" />
// //           Your browser does not support video.
// //         </video>
// //       )}

// //       <div style={{ marginTop: "1.5rem" }}>
// //         <button onClick={newChat} style={{ marginRight: "1rem" }}>
// //           Start New Chat
// //         </button>
// //         {count < 3 && (
// //           <button onClick={handleDidntUnderstand}>I didn't understand</button>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }


import React, { useContext, useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate} from "react-router-dom";
import { ChatContext } from "../context/ChatContext";
import { speakText } from "./speech";

// זו קומפוננטת המשנה שאחראית על שליפת והצגת הוראה בודדת או מספר הוראות
// שיניתי את שמה מ-TreatmentInstructions ל-TreatmentInstructionsDisplay כדי למנוע בלבול
const TreatmentInstructionsDisplay = ({ caseType, degree, degrees, currentCount }) => {
  const [instruction, setInstruction] = useState("Loading treatment instructions...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInstructions = useCallback(
    async (type, deg, degreesParam, count) => { // נוספו degreesParam
      setIsLoading(true);
      setError(null);
      try {
        let url = `${process.env.REACT_APP_API_URL}/treatment?case_type=${encodeURIComponent(type)}&count=${count}`;
        
        // כאן ההבדל העיקרי:
        // אם זה כוויה והתקבלה "degreesParam" (לדוגמה "all" או "1,2") - נשלח את זה לשרת
        if (type.toLowerCase().includes("burn") && degreesParam) {
          url += `&degrees=${encodeURIComponent(degreesParam)}`;
        } 
        // אחרת, אם יש "deg" (עבור מקרים שאינם כוויות או כוויה ספציפית בודדת) - נשלח אותו
        else if (deg !== undefined && deg !== null) {
          url += `&degree=${deg}`;
        }

        console.log("TreatmentScreen - Fetching URL:", url); // חשוב: נראה איזה URL נשלח

        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        // השרת יכול להחזיר מערך של הוראות (עבור "all") או אובייקט בודד
        setInstruction(data.result || data || "No further information available."); 
      } catch (err) {
        console.error("Failed to fetch treatment instructions:", err);
        setError(`Error loading treatment instructions: ${err.message}`);
        setInstruction("An error occurred while loading information.");
      } finally {
        setIsLoading(false);
      }
    },
    [] 
  );

  useEffect(() => {
    // מפעילים את הפונקציה כשפרמטרים משתנים
    fetchInstructions(caseType, degree, degrees, currentCount);
  }, [caseType, degree, degrees, currentCount, fetchInstructions]); 

  if (isLoading) {
    return <div>Loading treatment instructions...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  // לוגיקה להצגת התוכן:
  // אם השרת החזיר מערך של הוראות (כמו עבור "all" בכוויות), נעבור עליהן בלולאה
  if (Array.isArray(instruction)) {
    return (
      <div>
        {instruction.map((item, index) => (
          <div key={index} style={{ marginBottom: "1rem", borderBottom: "1px dashed #ccc", paddingBottom: "1rem" }}>
            {item.title && <h3>{item.title}</h3>}
            {typeof item.description === "string" && <p>{item.description}</p>}
            {item.image_url && <img src={item.image_url} alt={item.title || "Treatment visual"} style={{ maxWidth: "100%", height: "auto" }} />}
            {item.video_url && <video controls style={{ maxWidth: "100%", height: "auto" }}><source src={item.video_url} type="video/mp4" />Your browser does not support video.</video>}
          </div>
        ))}
      </div>
    );
  } 
  // אם השרת החזיר מחרוזת (הוראה בודדת)
  else if (typeof instruction === "string") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <p style={{ flex: 1 }}>{instruction}</p>
        {(currentCount === 0 || currentCount === 1) && (
          <button
            onClick={() => speakText(instruction)}
            title="Read aloud"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem"
            }}
          >
            🔊
          </button>
        )}
      </div>
    );
  } 
  // אם השרת החזיר אובייקט עם type: "image" או "video"
  else if (instruction && instruction.type === "image") {
    return (
      <img
        src={instruction.url}
        alt="treatment visual"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    );
  } else if (instruction && instruction.type === "video") {
    return (
      <video controls style={{ maxWidth: "100%", height: "auto" }}>
        <source src={instruction.url} type="video/mp4" />
        Your browser does not support video.
      </video>
    );
  }
  return <p>No further information available.</p>;
};

export default function TreatmentScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { newChat } = useContext(ChatContext);

  const initialCaseType = searchParams.get("case_type") || "";
  const initialDegreesParam = searchParams.get("degrees"); // יכול להיות "all" או "1,2"
  const initialDegree = searchParams.get("degree"); // עבור מקרים שאינם כוויות

  const currentCount = parseInt(searchParams.get("count") || "0", 10);

  // אין צורך ב-burnDegreesToShow יותר - לא עושים לולאה ב-Frontend!
  // ה-TreatmentInstructionsDisplay תבקש את הכל מהשרת בבת אחת.

  const handleNotUnderstood = useCallback(() => {
    setSearchParams((prevSearchParams) => {
      const newCount = parseInt(prevSearchParams.get("count") || "0", 10) + 1;
      if (newCount <= 3) {
        prevSearchParams.set("count", newCount.toString());
      }
      return prevSearchParams;
    });
  }, [setSearchParams]);

  const handleBackToChat = () => {
    navigate("/chat");
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", border: "1px solid #eee", borderRadius: "8px" }}>
      <h2>Treatment Page</h2>

      {!initialCaseType && (
        <p style={{ color: "gray" }}>
          Treatment instructions cannot be provided as no diagnosis was made. Please return to the chat and describe the emergency.
        </p>
      )}

      {initialCaseType && (
        initialCaseType.toLowerCase().includes("burn") ? (
          // אם זה כוויה, נשתמש ב-initialDegreesParam (שיכול להיות "all" או "1,2")
          // ונשלח אותו לקומפוננטת התצוגה.
          // ה-TreatmentInstructionsDisplay תעשה את הבקשה לשרת פעם אחת.
          <div>
            <h3>Treatment for Burns</h3>
            <TreatmentInstructionsDisplay 
              caseType={initialCaseType}
              degrees={initialDegreesParam} // מעבירים את הפרמטר "degrees" כמו שהוא
              currentCount={currentCount}
            />
            <button
              onClick={handleNotUnderstood}
              disabled={currentCount >= 3}
              style={{ marginTop: "0.5rem", marginBottom: "1rem" }}
            >
              I didn't understand (Next step)
            </button>
          </div>
        ) : (
          // עבור מקרים שאינם כוויות, זה נשאר כמעט אותו דבר
          <div>
            <h3>Treatment for {initialCaseType}</h3>
            <TreatmentInstructionsDisplay 
              caseType={initialCaseType}
              degree={initialDegree} 
              currentCount={currentCount}
            />
            <button
              onClick={handleNotUnderstood}
              disabled={currentCount >= 3}
              style={{ marginTop: "0.5rem", marginBottom: "1rem" }}
            >
              I didn't understand (Next step)
            </button>
          </div>
        )
      )}

      <hr style={{ margin: "2rem 0" }} />
      <button onClick={handleBackToChat}>Back to Chat</button>
      <button onClick={newChat} style={{ marginLeft: "1rem" }}>Start New Chat</button>
    </div>
  );
}
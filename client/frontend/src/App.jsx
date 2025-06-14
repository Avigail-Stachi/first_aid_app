// function App() {
//   const navigate = useNavigate();

//   const [showChat, setShowChat] = useState(false);
//   const [treatmentParams, setTreatmentParams] = useState(null);
//   const [inputMsg, setInputMsg] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [history, setHistory] = useState([]);
//   //const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [ambulance_flag, setAmbulance_flag] = useState(false);
//   const [isFinalDecision, setIsFinalDecision] = useState(false);
//   const [locationSent, setLocationSent] = useState(false);
//   const [showImageCapture, setShowImageCapture] = useState(false);
//   const [burnsDetected, setBurnsDetected] = useState(null);
//   // const [showInstructions, setShowInstructions] = useState(false);
//   // פונקציה זהה בזיכרון בין רינדורים
//   const handleLocation = useCallback((coords) => {
//     const { lat, lng } = coords;
//     const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
//     // שמירה כהודעה בצ'אט
//     setMessages((prev) => [
//       ...prev,
//       {
//         text: "I found this location on Google Maps:",
//         fromUser: false,
//       },
//       {
//         text: mapsUrl,
//         fromUser: false,
//         isLink: true, // אם תרצי, תעבירי flag כדי לטעון אותו כרכיב <a>
//       },
//       {
//         text: "Is this correct? If not, please enter your address or coordinates manually.",
//         fromUser: false,
//       },
//     ]);

//     // שליחה לשרת
//     fetch(`${process.env.REACT_APP_API_URL}/location`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(coords),
//     }).catch((err) => console.error("Error sending location:", err));

//     // מונע שליחה חוזרת
//     setLocationSent(true);
//   }, []);

//   const sendRequest = async () => {
//     if (!inputMsg.trim() || isFinalDecision) return;
//     console.log(5);
//     const userMessage = { text: inputMsg, fromUser: true };
//     setMessages((prev) => [...prev, userMessage]);
//     //setIsModalOpen(true);
//     const newHistory = [...history, inputMsg];
//     setHistory(newHistory);

//     try {
//       setIsLoading(true);
//       const res = await fetch(`${process.env.REACT_APP_API_URL}/predict`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           history: newHistory,
//           ambulance_flag: ambulance_flag,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error("Server error");
//       }

//       const data = await res.json();
//       const answer = data?.result || "Error: No result received";
//       const ambulanceFlag = data?.ambulance_flag || false;
//       const finalDecisionFlag = data?.has_decision || false;
//       if (data?.request_image) {
//         console.log("Server requested an image. Opening camera...");
//         setShowImageCapture(true);
//       }
//       // if (data.burns_detected) {
//       //   setBurnsDetected(data.burns_detected);
//       //   setShowImageCapture(true);
//       // } else {
//       //   setBurnsDetected(null);
//       // }
//       const newMessages = [
//         { text: answer, fromUser: false },
//         ...(ambulanceFlag
//           ? [
//               {
//                 text: "Ambulance required!",
//                 fromUser: false,
//                 isAmbulanceAlert: true,
//               },
//             ]
//           : []),
//       ];
//       setMessages((prev) => [...prev, ...newMessages]);
//       // setAmbulance_flag(ambulanceFlag)
//       // setHistory(newHistory);
//       setInputMsg("");
//       setAmbulance_flag(ambulanceFlag);
//       setIsFinalDecision(finalDecisionFlag);
//        if (finalDecisionFlag) {
//        setTreatmentParams({ caseType: answer, degree: data.degree ?? undefined });
//     }
//     } catch (error) {
//       setMessages((prev) => [
//         ...prev,
//         { text: "Error contacting server", fromUser: false },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const newChat = () => {
//     setMessages([]);
//     setHistory([]);
//     setInputMsg("");
//     setAmbulance_flag(false);
//     setIsFinalDecision(false);
//     setLocationSent(false);
//     setShowImageCapture(false);
//   };

//   const handleSendAudio = async (blob) => {
//     console.log("Audio MIME type:", blob.type);
//     console.log("Audio size:", blob.size, "bytes");

//     const url = URL.createObjectURL(blob);
//     const audioMessage = { audioUrl: url, fromUser: true };
//     setMessages((prev) => [...prev, audioMessage]);
//     // setHistory((prev) => [...prev, transcript]);

//     const formData = new FormData();
//     formData.append("audio", blob, "recording.webm"); // Give a filename with extension

//     try {
//       setIsLoading(true);
//       console.log(
//         "Sending audio to:",
//         `${process.env.REACT_APP_API_URL}/audio`
//       );

//       const res = await fetch(`${process.env.REACT_APP_API_URL}/audio`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("Server response:", res.status, errorText);
//         throw new Error(`Server error: ${res.status} ${errorText}`);
//       }

//       const data = await res.json();
//       console.log("Server response data:", data);

//       const transcript = data?.transcript || "";
//       const initialAnswer = data?.result || "";
//       console.log("Transcript:", transcript);
//       console.log("Initial answer:", initialAnswer);

//       setMessages((prev) =>
//         prev.map((msg) =>
//           msg.audioUrl === url ? { ...msg, transcript: transcript } : msg
//         )
//       );
//       // setMessages((prev) => [
//       //   ...prev,
//       //   { text: initialAnswer, fromUser: false },
//       // ]);
//       // setHistory((prev) => [...prev, initialAnswer]);

//       // Send history including the transcript in a separate query
//       const newHistory = [...history, transcript];
//       const predictRes = await fetch(
//         `${process.env.REACT_APP_API_URL}/predict`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             history: newHistory,
//             ambulance_flag: ambulance_flag,
//           }),
//         }
//       );

//       if (!predictRes.ok) {
//         const errorText = await predictRes.text();
//         console.error("Predict response:", predictRes.status, errorText);
//         throw new Error(
//           `Server error on predict: ${predictRes.status} ${errorText}`
//         );
//       }

//       const predictData = await predictRes.json();
//       const finalAnswer = predictData?.result || "Error: No result received";
//       const finalDecisionFlag = predictData?.has_decision || false;
//       const ambulanceFlag = predictData?.ambulance_flag || false;
//       setMessages((prev) => [
//         ...prev,
//         { text: finalAnswer, fromUser: false },
//         ...(ambulanceFlag
//           ? [
//               {
//                 text: "Ambulance required!",
//                 fromUser: false,
//                 isAmbulanceAlert: true,
//               },
//             ]
//           : []),
//       ]);

//       setHistory(newHistory);
//       setAmbulance_flag(ambulanceFlag);
//       setIsFinalDecision(finalDecisionFlag);
//     } catch (error) {
//       console.error("Error in handleSendAudio:", error);
//       setMessages((prev) => [
//         ...prev,
//         { text: `Error contacting server: ${error.message}`, fromUser: false },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (!showChat) {
//     return <HomeScreen onStartChat={() => setShowChat(true)} />;
//  }
// //   return (
// //     <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
// //       <h1>ResQPal Chat</h1>
// //       <ChatWindow messages={messages} />
// //       <MessageInput
// //         inputMsg={inputMsg}
// //         setInputMsg={setInputMsg}
// //         onSend={sendRequest}
// //         disabled={isLoading || isFinalDecision}
// //       />
// //       {!isFinalDecision && <VoiceRecorder onSendAudio={handleSendAudio} />}
// //       {/* <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} /> */}
// //       {/* {ambulance_flag && isFinalDecision && (
// //         <LocationFetcher
// //           onLocation={(coords) => {
// //             const { lat, lng } = coords;

// //             // שמירה כהודעה בצ'אט
// //             setMessages((prev) => [
// //               ...prev,
// //               {
// //                 text: "Sending your location to emergency services...",
// //                 fromUser: false,
// //               },
// //               {
// //                 text: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
// //                 fromUser: true,
// //               },
// //             ]);

// //             // שליחה לשרת
// //             fetch(`${process.env.REACT_APP_API_URL}/location`, {
// //               method: "POST",
// //               headers: {
// //                 "Content-Type": "application/json",
// //               },
// //               body: JSON.stringify(coords),
// //             }).catch((err) => console.error("Error sending location:", err));
// //           }}
// //         />
// //       )} */}
// //       {showImageCapture && (
// //         <ImageCapture
// //           burnsDetected={burnsDetected}
// //           onCancel={() => {
// //             setShowImageCapture(false);
// //             setBurnsDetected(null);
// //           }}
// //           onCapture={(result) => {
// //             console.log("Image capture result:", result);
// //             setShowImageCapture(false);
// //             setBurnsDetected(null);
// //             // כאן תוכל להוסיף לוגיקה נוספת אם תרצה
// //           }}
// //         />
// //       )}

// //       {ambulance_flag && isFinalDecision && !locationSent && (
// //         <LocationFetcher onLocation={handleLocation} />
// //       )}
// //       {/* {!showInstructions && (
// //         <button onClick={() => setShowInstructions(true)}>What to do?</button>
// //       )} */}

// //       {showInstructions && (
// //         <Instructions onClose={() => setShowInstructions(false)} />
// //       )}
// //       <button onClick={newChat} style={{ marginTop: "1rem" }}>
// //         Start New Chat
// //       </button>
// //     </div>
// //   );
// // }
// // export default App;
//  return (
//     <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
//       <h1>ResQPal Chat</h1>
//       <ChatWindow messages={messages} />
//       <MessageInput
//         inputMsg={inputMsg}
//         setInputMsg={setInputMsg}
//         onSend={sendRequest}
//         disabled={isLoading || isFinalDecision}
//       />
//       {!isFinalDecision && <VoiceRecorder onSendAudio={handleSendAudio} />}
//       {ambulance_flag && isFinalDecision && !locationSent && <LocationFetcher onLocation={handleLocation} />}
//       {showImageCapture && (
//         <ImageCapture
//           burnsDetected={burnsDetected}
//           onCancel={() => {
//             setShowImageCapture(false);
//             setBurnsDetected(null);
//           }}
//           onCapture={(result) => {
//             setMessages((prev) => [...prev, { text: `Image result: ${result}`, fromUser: false }]);
//             setShowImageCapture(false);
//           }}
//         />
//       )}

//       <button onClick={newChat} style={{ marginTop: "1rem" }}>
//         Start New Chat
//       </button>

//       {/* כפתור ניווט להוראות טיפול, מנוטרל עד שיש החלטה סופית */}
//       <button
//         onClick={() => navigate("/treatment")}
//         disabled={!isFinalDecision}
//         style={{
//           marginTop: "1rem",
//           marginLeft: "1rem",
//           opacity: isFinalDecision ? 1 : 0.5,
//           cursor: isFinalDecision ? "pointer" : "not-allowed",
//         }}
//       >
//         Go to Treatment Instructions
//       </button>
//     </div>
//   );
// }

// export default function AppWrapper() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/treatment" element={<TreatmentScreen />} />
//         <Route path="/*" element={<App />} />
//       </Routes>
//     </Router>
//   );
// }

import React from "react";
import { Routes, Route } from "react-router-dom";
import HomeScreen from "./components/HomeScreen";
import ChatPage from "./components/Chat/ChatPage";
import TreatmentScreen from "./components/TreatmentScreen";
//import { ChatContext } from "./context/ChatContext";
import "./App.css";
//import { useNavigate } from "react-router-dom";
export default function App() {
  //const navigate = useNavigate();
  //const {newChat}= useContext(ChatContext);
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/chat" element={<ChatPage />} />

      <Route
        path="/treatment"
        element={<TreatmentScreen />}
      />
    </Routes>
  );
}

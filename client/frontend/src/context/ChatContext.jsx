import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [ambulance_flag, setAmbulance_flag] = useState(false);
  const [isFinalDecision, setIsFinalDecision] = useState(false);
  const [locationSent, setLocationSent] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [treatmentParams, setTreatmentParams] = useState({
    caseType: "",
    degree: undefined, // עבור מקרים שאינם כוויות, או כוויה עם דרגה בודדת מהאבחון הטקסטואלי
    hasImageDiagnosis: false, // האם האבחון האחרון כלל תמונה
    identifiedDegrees: [], // מערך של דרגות כוויה זוהות מהתמונה (לדוגמה: [1, 2])
  });
  
  const navigate = useNavigate();

  const newChat = () => {
    setMessages([]);
    setInputMsg("");
    setHistory([]);
    setAmbulance_flag(false);
    setIsFinalDecision(false);
    setLocationSent(false);
    setShowImageCapture(false);
    // איפוס מלא של treatmentParams לערכים ההתחלתיים
    setTreatmentParams({
      caseType: "",
      degree: undefined,
      hasImageDiagnosis: false,
      identifiedDegrees: [],
    });
    navigate("/chat");
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        history,
        setHistory,
        inputMsg,
        setInputMsg,
        ambulance_flag,
        setAmbulance_flag,
        isFinalDecision,
        setIsFinalDecision,
        locationSent,
        setLocationSent,
        showImageCapture,
        setShowImageCapture,
        treatmentParams,
        setTreatmentParams,
        newChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

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
  const [treatmentParams, setTreatmentParams] = useState(null);

  const navigate = useNavigate();

  const newChat = () => {
    setMessages([]);
    setHistory([]);
    setInputMsg("");
    setAmbulance_flag(false);
    setIsFinalDecision(false);
    setLocationSent(false);
    setShowImageCapture(false);
    setTreatmentParams(null);
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

import React, { useState, useCallback,useContext } from "react";
import { useNavigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import VoiceRecorder from "./VoiceRecorder";
import LocationFetcher from "./LocationFetcher";
import ImageCapture from "../ImageCapture";
import ChatActions from "./ChatActions";
import { ChatContext } from "../../context/ChatContext";


const ChatPage = () => {
    const navigate = useNavigate();

  const {
    messages,
    setMessages,
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
    history,
    setHistory,
  } = useContext(ChatContext);

  const [isLoading, setIsLoading] = useState(false);

  const handleLocation = useCallback((coords) => {
    const { lat, lng } = coords;
    setMessages((prev) => [
      ...prev,
      { text: "I found this location on Google Maps:", fromUser: false },
      {
        text: `https://maps.google.com/?q=${lat},${lng}`,
        fromUser: false,
        isLink: true,
      },
      { text: "Is this correct?", fromUser: false },
    ]);
    fetch(`${process.env.REACT_APP_API_URL}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords),
    }).catch(console.error);
    setLocationSent(true);
  }, [setMessages, setLocationSent]);

  const sendRequest = async () => {
    if (!inputMsg.trim() || isFinalDecision) return;
    setMessages((prev) => [...prev, { text: inputMsg, fromUser: true }]);
    const newHistory = [...history, inputMsg];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory, ambulance_flag }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { text: data.result, fromUser: false },
        ...(data.ambulance_flag
          ? [
              {
                text: "Ambulance required!",
                fromUser: false,
                isAmbulanceAlert: true,
              },
            ]
          : []),
      ]);
      setAmbulance_flag(data.ambulance_flag);
      setIsFinalDecision(data.has_decision);
      setInputMsg("");

      if (data.has_decision) {
        setTreatmentParams({
          caseType: data.result,
          degree: data.degree ?? undefined,
        });
      }
      if (data.request_image) {
        setShowImageCapture(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Error contacting server", fromUser: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAudio = async (blob) => {
    const url = URL.createObjectURL(blob);
    const audioMessage = { audioUrl: url, fromUser: true };
    setMessages((prev) => [...prev, audioMessage]);

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      setIsLoading(true);

      const res = await fetch(`${process.env.REACT_APP_API_URL}/audio`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      const transcript = data?.transcript || "";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.audioUrl === url ? { ...msg, transcript: transcript } : msg
        )
      );

      const newHistory = [...history, transcript];
      const predictRes = await fetch(
        `${process.env.REACT_APP_API_URL}/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: newHistory,
            ambulance_flag: ambulance_flag,
          }),
        }
      );

      if (!predictRes.ok) {
        const errorText = await predictRes.text();
        throw new Error(
          `Server error on predict: ${predictRes.status} ${errorText}`
        );
      }

      const predictData = await predictRes.json();
      const finalAnswer = predictData?.result || "Error: No result received";
      const finalDecisionFlag = predictData?.has_decision || false;
      const ambulanceFlag = predictData?.ambulance_flag || false;
      setMessages((prev) => [
        ...prev,
        { text: finalAnswer, fromUser: false },
        ...(ambulanceFlag
          ? [
              {
                text: "Ambulance required!",
                fromUser: false,
                isAmbulanceAlert: true,
              },
            ]
          : []),
      ]);

      setHistory(newHistory);
      setAmbulance_flag(ambulanceFlag);
      setIsFinalDecision(finalDecisionFlag);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: `Error contacting server: ${error.message}`, fromUser: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setInputMsg("");
    setHistory([]);
    setAmbulance_flag(false);
    setIsFinalDecision(false);
    setLocationSent(false);
    setShowImageCapture(false);
    setTreatmentParams({});
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem" }}>
      <h1>ResQPal Chat</h1>
      <ChatWindow messages={messages} />
      <MessageInput
        inputMsg={inputMsg}
        setInputMsg={setInputMsg}
        onSend={sendRequest}
        disabled={isLoading || isFinalDecision}
      />
      {!isFinalDecision && <VoiceRecorder onSendAudio={handleSendAudio} />}
      {ambulance_flag && isFinalDecision && !locationSent && (
        <LocationFetcher onLocation={handleLocation} />
      )}
      {showImageCapture && (
        <ImageCapture
          onCancel={() => setShowImageCapture(false)}
          onCapture={(result) => {
            setMessages((prev) => [
              ...prev,
              { text: `Image result: ${result}`, fromUser: false },
            ]);
            setShowImageCapture(false);
          }}
        />
      )}
      <ChatActions
        newChat={newChat}
        treatmentParams={treatmentParams}
        navigate={navigate}
      />
    </div>
  );
};

export default ChatPage;

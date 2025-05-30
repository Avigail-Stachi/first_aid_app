import React, { useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import VoiceRecorder from "./VoiceRecorder";
import LocationFetcher from "./LocationFetcher";
import ImageCapture from "../ImageCapture";
import ChatActions from "./ChatActions";
import { ChatContext } from "../../context/ChatContext";
import { speakText } from "../speach";
const ChatPage = () => {
  const navigate = useNavigate();
  const [lastPrediction, setLastPrediction] = useState("");
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

  const handleLocation = useCallback(
    async ({ lat, lng, address }) => {
      // setMessages((prev) => [
      //   ...prev,
      //   { text: "I found this location on Google Maps:", fromUser: false },
      //   {
      //     text: `https://maps.google.com/?q=${lat},${lng}`,
      //     fromUser: false,
      //     isLink: true,
      //   },
      //   { text: "Is this correct?", fromUser: false },
      // ]);
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/send_sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coords: { lat, lng },
            //history: history,
            prediction: lastPrediction || "No diagnosis provided.",
            message: history.join(" ") || "First-aid emergency reported.",
          }),
        });
        if (!res.ok) {
          let errorText;
          try {
            const errorJson = await res.json();
            errorText = JSON.stringify(errorJson.detail || errorJson);
          } catch {
            errorText = await res.text();
          }
          setMessages((prev) => [
            ...prev,
            { text: `Error sending SMS: ${errorText}`, fromUser: false },
          ]);
          return;
        }

        const data = await res.json();
        console.log("SMS response:", data);

        if (data.sid.status === "dev_mode") {
          setMessages((prev) => [
            ...prev,
            {
              text: `Development mode: SMS was NOT sent.`,
              fromUser: false,
            },
            {
              text: `Message content:\n${data.sid.sent_message}`,
              fromUser: false,
            },
          ]);
        } else if (data.sid.status === "failure") {
          setMessages((prev) => [
            ...prev,
            {
              text: `SMS not sent due to error: ${data.error}`,
              fromUser: false,
            },
            {
              text: `Please manually send the following message to MDA:\n${data.manual_message}`,
              fromUser: false,
            },
            {
              text: `Suggestion: ${data.suggestion}`,
              fromUser: false,
            },
          ]);
        } else if (data.sid.status === "success") {
          setMessages((prev) => [
            ...prev,
            {
              text: `Location sent: ${
                address || `(${lat.toFixed(5)}, ${lng.toFixed(5)})`
              }`,
              fromUser: false,
            },
            {
              text:
                data.message ||
                "SMS sent to MDA with your location and details.",
              fromUser: false,
            },
          ]);
          setLocationSent(true);
        } else {
          // fallback: show generic message
          setMessages((prev) => [
            ...prev,
            {
              text: data.message || "Unknown response from server.",
              fromUser: false,
            },
          ]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            text: `❌ Error sending SMS: ${error.message}. Please send location and info to MDA manually.`,
            fromUser: false,
          },
        ]);
        console.error("Error sending SMS:", error);
      }
    },
    [setMessages, setLocationSent, history, lastPrediction]
  );
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
      setLastPrediction(data.result);
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
        <LocationFetcher onLocation={handleLocation} 
        />
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

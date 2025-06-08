import React, { useState, useCallback, useContext, useEffect } from "react";
//import { useNavigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import VoiceRecorder from "./VoiceRecorder";
import LocationFetcher from "./LocationFetcher";
//import ImageCapture from "../ImageCapture";
import ImageUploader from "./image/ImageUploader";
import ChatActions from "./ChatActions";
import { ChatContext } from "../../context/ChatContext";
// import { speakText } from "../speech";
const ChatPage = () => {
  //const navigate = useNavigate();
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
    //treatmentParams,
    setTreatmentParams,
    history,
    setHistory,
    //newChat,
    isUserInputLocked,
    setIsUserInputLocked,
  } = useContext(ChatContext);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const shouldLock = isFinalDecision || showImageCapture;
    setIsUserInputLocked(shouldLock);
  }, [isFinalDecision, showImageCapture, setIsUserInputLocked]);

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
            {
              text: `Error sending SMS: ${errorText}`,
              fromUser: false,
              isSpeakable: true,
            }, 
          ]);
          return;
        }

        const data = await res.json();
        console.log("SMS response:", data);

        if (data.status === "dev_mode") {
          setMessages((prev) => [
            ...prev,
            {
              text: `Development mode: SMS was NOT sent.`,
              fromUser: false,
              isSpeakable: true,
            },
            {
              text: `Message content:\n${data.sent_message}`,
              fromUser: false,
              isSpeakable: true,
            },
          ]);
        } else if (data.status === "failure") {
          setMessages((prev) => [
            ...prev,
            {
              text: `SMS not sent due to error: ${data.error}`,
              fromUser: false,
              isSpeakable: true,
            },
            {
              text: `Please manually send the following message to MDA:\n${data.manual_message}`,
              fromUser: false,
              isSpeakable: true,
            },
            {
              text: `Suggestion: ${data.suggestion}`,
              fromUser: false,
              isSpeakable: true,
            },
          ]);
        } else if (data.status === "success") {
          setMessages((prev) => [
            ...prev,
            {
              text: `Location sent: ${
                address || `(${lat.toFixed(5)}, ${lng.toFixed(5)})`
              }`,
              fromUser: false,
              isSpeakable: true,
            },
            {
              text:
                data.message ||
                "SMS sent to MDA with your location and details.",
              fromUser: false,
              isSpeakable: true,
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
              isSpeakable: true,
            },
          ]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            text: `❌ Error sending SMS: ${error.message}. Please send location and info to MDA manually.`,
            fromUser: false,
            isSpeakable: true,
          },
        ]);
        console.error("Error sending SMS:", error);
      }
    },
    [setMessages, setLocationSent, history, lastPrediction]
  );
  const sendRequest = async () => {
    if (!inputMsg.trim() || isFinalDecision || isUserInputLocked) return;
    setMessages((prev) => [
      ...prev,
      { text: inputMsg, fromUser: true, isSpeakable: false },
    ]);
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
        { text: data.result, fromUser: false, isSpeakable: true },
        ...(data.ambulance_flag
          ? [
              {
                text: "Ambulance required!",
                fromUser: false,
                isAmbulanceAlert: true,
                isSpeakable: true,
              },
            ]
          : []),
      ]);
      //speakText(data.result);
      setAmbulance_flag(data.ambulance_flag);
      setIsFinalDecision(data.has_decision);
      setInputMsg("");
      setLastPrediction(data.result);

      // if (data.has_decision) {
      //   const isBurnAwaitingImage =
      //     data.result.toLowerCase().includes("burns") &&
      //     data.result.toLowerCase().includes("awaiting image");

      //   setTreatmentParams({
      //     caseType: isBurnAwaitingImage
      //       ? data.result
      //           .replace(" (awaiting image for severity assessment)", "")
      //           .trim() // ננקה את ההודעה
      //       : data.result,
      //     degree: data.degree ?? undefined, // יהיה קיים רק אם זה לא כוויה
      //     hasImageDiagnosis: false, // בשלב הטקסטואלי, אין אבחון תמונה
      //     identifiedDegrees: [], // אין דרגות זוהות מתמונה בשלב זה
      //     predictImageBase64: null, // אין תמונה בשלב זה
      //   });
      // }

      const isBurnAwaitingImage =
        data.result.toLowerCase().includes("burns") &&
        data.result.toLowerCase().includes("awaiting image");

      setTreatmentParams({
        caseType: isBurnAwaitingImage
          ? data.result
              .replace(" (awaiting image for severity assessment)", "")
              .trim()
          : data.result,
        degree: data.degree ?? undefined, // יהיה קיים רק אם זה לא כוויה
        hasImageDiagnosis: false, // בשלב הטקסטואלי, אין אבחון תמונה
        identifiedDegrees: [], // אין דרגות זוהות מתמונה בשלב זה
        predictImageBase64: null, // אין תמונה בשלב זה
      });

      if (
        data.result &&
        data.result.toLowerCase().includes("burns") &&
        data.result.toLowerCase().includes("awaiting image")
      ) {
        setShowImageCapture(true);
      } else {
        setShowImageCapture(false);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Error contacting server", fromUser: false, isSpeakable: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAudio = async (blob) => {
    if (isFinalDecision || isUserInputLocked) return;
    const url = URL.createObjectURL(blob);
    const audioMessage = { audioUrl: url, fromUser: true, isSpeakable: false };
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
          msg.audioUrl === url
            ? { ...msg, transcript: transcript, isSpeakable: false }
            : msg
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
        { text: finalAnswer, fromUser: false, isSpeakable: true },
        ...(ambulanceFlag
          ? [
              {
                text: "Ambulance required!",
                fromUser: false,
                isAmbulanceAlert: true,
                isSpeakable: true,
              },
            ]
          : []),
      ]);
      //speakText(finalAnswer);

      setHistory(newHistory);
      setAmbulance_flag(ambulanceFlag);
      setIsFinalDecision(finalDecisionFlag);
      setLastPrediction(finalAnswer);

      // if (finalDecisionFlag) {
      //   setTreatmentParams({
      //     caseType: finalAnswer,
      //     degree: predictData?.degree ?? undefined,
      //   });
      // }

      const isBurnAwaitingImage =
        finalAnswer.toLowerCase().includes("burns") &&
        finalAnswer.toLowerCase().includes("awaiting image");
      setTreatmentParams({
        caseType: isBurnAwaitingImage
          ? finalAnswer
              .replace(" (awaiting image for severity assessment)", "")
              .trim()
          : finalAnswer,
        degree: predictData?.degree ?? undefined,
        hasImageDiagnosis: false,
        identifiedDegrees: [],
        predictImageBase64: null,
      });
      // if (finalDecisionFlag) {
      //   const isBurnAwaitingImage =
      //     finalAnswer.toLowerCase().includes("burns") &&
      //     finalAnswer.toLowerCase().includes("awaiting image");
      //   setTreatmentParams({
      //     caseType: isBurnAwaitingImage
      //       ? finalAnswer
      //           .replace(" (awaiting image for severity assessment)", "")
      //           .trim()
      //       : finalAnswer,
      //     degree: predictData?.degree ?? undefined,
      //     hasImageDiagnosis: false,
      //     identifiedDegrees: [],
      //     predictImageBase64: null,
      //   });
      // }
      if (
        finalAnswer &&
        finalAnswer.toLowerCase().includes("burns") &&
        finalAnswer.toLowerCase().includes("awaiting image")
      ) {
        setShowImageCapture(true);
      } else {
        setShowImageCapture(false);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: `Error contacting server: ${error.message}`,
          fromUser: false,
          isSpeakable: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem" }}>
      <h1>ResQPal Chat</h1>
      <ChatWindow messages={messages} />
      <MessageInput
        inputMsg={inputMsg}
        setInputMsg={setInputMsg}
        onSend={sendRequest}
        disabled={isLoading || isUserInputLocked}
      />
      {!isUserInputLocked && (
        <VoiceRecorder
          onSendAudio={handleSendAudio}
          disabled={isUserInputLocked}
        />
      )}

      {ambulance_flag && isFinalDecision && !locationSent && (
        <LocationFetcher onLocation={handleLocation} />
      )}

      {showImageCapture && (
        <ImageUploader
          onImageSend={(imgURL) =>
            setMessages((prev) => [
              ...prev,
              {
                text: `Image uploaded successfully:`,
                fromUser: true,
                isImage: true,
                imageUrl: imgURL,
                //isSpeakable: false,
              },
            ])
          }
          onCancel={() => setShowImageCapture(false)}
        />
      )}
      {/* Uncomment if you want to use the ImageCapture component */}
      {/* {showImageCapture && (
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
      )} */}
      <ChatActions />
      {/* <ChatActions
        newChat={newChat}
        treatmentParams={treatmentParams}
        navigate={navigate}
      /> */}
    </div>
  );
};

export default ChatPage;

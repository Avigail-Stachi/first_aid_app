import React, { useState } from "react";
//import { FaTrash } from 'react-icons/fa';

import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import VoiceRecorder from "./components/VoiceRecorder";
//import Modal from "./components/Modal";
import "./App.css";

function App() {
  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  //const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sendRequest = async () => {
    if (!inputMsg.trim()) return;

    const userMessage = { text: inputMsg, fromUser: true };
    setMessages((prev) => [...prev, userMessage]);
    //setIsModalOpen(true);
    const newHistory = [...history, inputMsg];
    setHistory(newHistory);

    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ history: newHistory }),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();
      const answer = data?.result || "Error: No result received";

      setMessages((prev) => [...prev, { text: answer, fromUser: false }]);
      setHistory([...newHistory, answer]);
      setInputMsg("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: "Error contacting server", fromUser: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setHistory([]);
    setInputMsg("");
  };

const handleSendAudio = async (blob) => {
  const url = URL.createObjectURL(blob);
  const audioMessage = { audioUrl: url, fromUser: true };
  setMessages((prev) => [...prev, audioMessage]);
  setHistory((prev) => [...prev, "[Audio message sent]"]);

  const formData = new FormData();
  formData.append("audio", blob);

  try {
    setIsLoading(true);

    const res = await fetch(`${process.env.REACT_APP_API_URL}/audio`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Server error");

    const data = await res.json();
    const transcript = data?.transcript || "";
    const initialAnswer = data?.result || "";

    setMessages((prev) =>
      prev.map((msg) =>
        msg.audioUrl === url ? { ...msg, transcript: transcript } : msg
      )
    );
    setMessages((prev) => [...prev, { text: initialAnswer, fromUser: false }]);
    setHistory((prev) => [...prev, initialAnswer]);

    // כאן אפשר לשלוח את כל ההיסטוריה כולל התמלול בשאילתה נפרדת
    const newHistory = [...history, transcript];
    const predictRes = await fetch(`${process.env.REACT_APP_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: newHistory }),
    });

    if (!predictRes.ok) throw new Error("Server error on predict");
    const predictData = await predictRes.json();
    const finalAnswer = predictData?.result || "Error: No result received";

    setMessages((prev) => [...prev, { text: finalAnswer, fromUser: false }]);
    setHistory((prev) => [...prev, finalAnswer]);

  } catch (error) {
    setMessages((prev) => [
      ...prev,
      { text: "Error contacting server", fromUser: false },
    ]);
  } finally {
    setIsLoading(false);
  }
};






  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <h1>ResQPal Chat</h1>
      <ChatWindow messages={messages} />
      <MessageInput
        inputMsg={inputMsg}
        setInputMsg={setInputMsg}
        onSend={sendRequest}
        disabled={isLoading}
      />
      <VoiceRecorder onSendAudio={handleSendAudio} />
      {/* <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} /> */}

      <button onClick={newChat} style={{ marginTop: "1rem" }}>
        Start New Chat
      </button>
    </div>
  );
}

export default App;

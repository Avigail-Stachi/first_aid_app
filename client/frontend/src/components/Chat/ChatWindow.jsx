import React, {useEffect,useRef} from "react";
import { speakText } from "../speech";
const ChatWindow = ({ messages }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "1rem",
        height: "400px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {messages.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>No messages yet</p>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            alignSelf: msg.fromUser ? "flex-end" : "flex-start",
            backgroundColor: msg.fromUser ? "#e0ffe0" : "#f0f0f0",
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            maxWidth: "70%",
            wordWrap: "break-word",
          }}
        >
          {msg.isPredictedImage ? (
            <>
              {msg.text && <p>{msg.text}</p>}{" "}
              {/* <--- שינוי: מציג את הטקסט אם קיים */}
              <img
                src={msg.imageUrl}
                alt="Predicted Burn"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "5px",
                  marginTop: "5px",
                }}
              />
            </>
          ) : msg.isImage ? (
            <>
              {msg.text && <p>{msg.text}</p>}
              <img
                src={msg.imageUrl}
                alt="User Upload"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "5px",
                  marginTop: "5px",
                }}
              />
            </>
          ) : msg.isAmbulanceAlert ? (
            <strong style={{ color: "red" }}>{msg.text}</strong>
          ) : msg.audioUrl ? (
            <>
              <audio controls src={msg.audioUrl} />
              {msg.transcript && (
                <p style={{ fontSize: "0.8em", color: "#666" }}>
                  (Transcript: {msg.transcript})
                </p>
              )}
            </>
          ) : msg.isLink ? (
            <a href={msg.text} target="_blank" rel="noopener noreferrer">
              {msg.text}
            </a>
          ) : (
            <>
              <p>{msg.text}</p>
              {/* כפתור רמקול להקראת הטקסט - רק אם יש טקסט ולא תמונה */}
              {msg.text && (
                <button
                  onClick={() => speakText(msg.text)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: "#555",
                    marginLeft: "8px",
                  }}
                  aria-label="Speak message"
                  title="Tap to read the message."
                >
                  🔊
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;

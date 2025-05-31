import React from "react";
import { speakText } from "../speech";
const ChatWindow = ({ messages }) => {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "1rem",
        height: "400px",
        overflowY: "auto",
        backgroundColor: "#f9f9f9",
        marginBottom: "1rem",
      }}
    >
      {messages.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>No messages yet</p>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            marginBottom: "1rem",
            textAlign: msg.fromUser ? "right" : "left",
          }}
        >
          {msg.isAmbulanceAlert && (
            <div
              style={{
                backgroundColor: "#ffdddd",
                color: "#b30000",
                border: "2px solid red",
                borderRadius: "10px",
                padding: "12px",
                fontWeight: "bold",
                maxWidth: "80%",
                margin: msg.fromUser ? "0 0 0 auto" : "0 auto 0 0",
              }}
            >
              🚨 Emergency! Ambulance needed
            </div>
          )}
            {msg.text && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: msg.fromUser ? "#DCF8C6" : "#EAEAEA",
                color: "#333",
                padding: "8px 12px",
                borderRadius: "15px",
                maxWidth: "80%",
                wordWrap: "break-word",
                margin: 0,
              }}
            >
              {msg.isLink ? (
                <a
                  href={msg.text}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#1a0dab",
                    textDecoration: "underline",
                    marginRight: "8px",
                  }}
                >
                  {msg.text}
                </a>
              ) : (
                <span style={{ marginRight: "8px" }}>{msg.text}</span>
              )}

              {/* כפתור רמקול להקראת הטקסט */}
              <button
                onClick={() => speakText(msg.text)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#555",
                }}
                aria-label="Speak message"
                title="הקש להקראת ההודעה"
              >
                🔊
              </button>
            </div>
          )}

          {msg.audioUrl && (
            <audio
              controls
              src={msg.audioUrl}
              style={{ marginTop: "5px", maxWidth: "80%" }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatWindow;
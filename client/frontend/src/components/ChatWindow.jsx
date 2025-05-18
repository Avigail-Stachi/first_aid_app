import React from "react";

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
      {messages.length === 0 }
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            marginBottom: "1rem",
            textAlign: msg.fromUser ? "right" : "left",
          }}
        >
          {msg.text && (
            <p
              style={{
                display: "inline-block",
                backgroundColor: msg.fromUser ? "#DCF8C6" : "#EAEAEA",
                color: "#333",
                padding: "8px 12px",
                borderRadius: "15px",
                maxWidth: "80%",
                wordWrap: "break-word",
                margin: 0,
              }}
            >
              {msg.text}
            </p>
          )}
          {msg.audioUrl && (
            <audio controls src={msg.audioUrl} style={{ marginTop: "5px", maxWidth: "80%" }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatWindow;

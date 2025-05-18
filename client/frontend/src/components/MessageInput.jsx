//להציג טקסט וכפתור שליחה
//לשלוח לשרת כשנלחץ שלח או אנטר

import React from "react";

import "../styles.css/MessageInput.css";

function MessageInput(props) {
  const { inputMsg, setInputMsg, onSend, disabled } = props;
  //לנקות מתווים זדוניים ורווחים מיותרים
  const sanitizeInput = (value) => {
    const cleaned = value.replace(/[^\w\s.,!?'\n]/g, "");
    return cleaned
      .split("\n")
      .map((line) => line.trim().replace(/\s+/g, " "))
      .join("\n");
  };
  //טיפול בשינוי בתיבת טקסט
  const handleChange = (e) => {
    const sanitized = sanitizeInput(e.target.value);
    setInputMsg(sanitized);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputMsg.trim() !== "") {
        onSend();
      }
    }
  };
  return (
    <div className="message-input-container">
      <textarea
        type="text"
        value={inputMsg}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Describe the emergency..."
        className="message-input-textarea"
      />
      <button
        onClick={onSend}
        disabled={disabled}
        className="message-input-button"
      >
        Send
      </button>
    </div>
  );
}

export default MessageInput;

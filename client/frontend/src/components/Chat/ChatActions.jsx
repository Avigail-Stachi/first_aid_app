import React from "react";

export default function ChatActions({ newChat, treatmentParams, navigate }) {
  return (
    <>
      <button onClick={newChat} style={{ marginTop: "1rem" }}>
        Start New Chat
      </button>
      <button
        onClick={() => {
          if (!treatmentParams) return;
          let url = `/treatment?case_type=${encodeURIComponent(
            treatmentParams.caseType
          )}&count=0`;
          if (treatmentParams.degree) url += `&degree=${treatmentParams.degree}`;
          navigate(url);
        }}
        disabled={!treatmentParams}
        style={{
          marginLeft: "1rem",
          marginTop: "1rem",
          opacity: treatmentParams ? 1 : 0.5,
          cursor: treatmentParams ? "pointer" : "not-allowed",
        }}
      >
        What to do?
      </button>
    </>
  );
}

import React, { useState, useRef, useEffect } from "react";

function VoiceRecorder({ onSendAudio, disabled }) {
  const [status, setStatus] = useState("idle"); // idle, recording, recorded
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioUrlRef = useRef(null);
  const audioRef = useRef(null);

  // התחלת הקלטה
  const startRecording = async () => {
    if (disabled) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = URL.createObjectURL(blob);
      setStatus("recorded");
    };

    mediaRecorderRef.current.start();
    setStatus("recording");
  };

  // עצירת ההקלטה
  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  // שליחת ההקלטה ל-App
  const sendRecording = () => {
    if (disabled || !audioChunksRef.current.length) {
      return;
    }
    console.log("iiiiiiiiiiiiiiiiiiiii");

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    console.log(blob);
    onSendAudio(blob);
    resetRecording();
  };

  // איפוס הקלטה
  const resetRecording = () => {
    setStatus("idle");
    audioChunksRef.current = [];
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  // ניקוי זיכרון כאשר הקומפוננטה מתרוקנת
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  return (
    <div style={{ border: "1px solid gray", padding: 10, maxWidth: 400 }}>
      {status === "idle" && (
        <button onClick={startRecording} disabled={disabled}>
          Start Recording
        </button>
      )}

      {status === "recording" && (
        <>
          <button onClick={stopRecording} disabled={disabled}>
            Stop Recording
          </button>
          <p>Recording...</p>
        </>
      )}

      {status === "recorded" && (
        <>
          <audio ref={audioRef} src={audioUrlRef.current} controls />
          <div style={{ marginTop: 10 }}>
            <button onClick={sendRecording} disabled={disabled}>
              Send Recording
            </button>
            <button
              onClick={resetRecording}
              style={{ marginLeft: 10 }}
              disabled={disabled}
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VoiceRecorder;

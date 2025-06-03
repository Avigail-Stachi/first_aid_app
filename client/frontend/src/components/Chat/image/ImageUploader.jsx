import React, { useRef, useState, useEffect, useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";

const ImageUploader = ({ onImageSend }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  const {
    setMessages,
    setIsFinalDecision,
    setTreatmentParams,
    setShowImageCapture,
    setHistory,
  } = useContext(ChatContext);

  useEffect(() => {
    const startStream = async () => {
      if (!showCamera || !videoRef.current) return;

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        console.error("Failed to access camera:", err);
        alert("Camera access denied or not available.");
        setShowCamera(false);
      }
    };

    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    };
  }, [showCamera]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);

    await sendImageToServer(file, imageUrl);
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleStartCamera = () => {
    setShowCamera(true);
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("Failed to get blob from canvas");
        return;
      }

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(blob);

      setPreview(imageUrl);
      stopCamera(); // סגירת המצלמה מיידית אחרי צילום
      await sendImageToServer(file, imageUrl);
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const sendImageToServer = async (fileOrBlob, previewUrl) => {
    onImageSend(previewUrl);

    const formData = new FormData();
    formData.append("image", fileOrBlob);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Image upload error:", errorText);
        setMessages((prev) => [
          ...prev,
          { text: `Image upload failed: ${errorText}`, fromUser: false },
        ]);
        return;
      }

      const data = await res.json();
      console.log("Image uploaded and processed:", data);

      let messageText = "";

      if (data.has_decision) {
        if (Array.isArray(data.result)) {
          messageText =
            `We detected ${data.result.length} burn injuries in the image:\n\n` +
            data.result
              .map((item, idx) => `• Burn #${idx + 1}: Degree ${item.degree}`)
              .join("\n") +
            `\n\nIf you believe one is missing, try uploading a clearer image.`;
        } else {
          messageText = `We detected one burn injury${data.degree ? ` (Degree ${data.degree})` : ""}.`;
        }
        stopCamera(); // סגירת מצלמה אם קיבלנו תשובה סופית
      } else {
        messageText =
          `We could not determine the burn severity with high confidence.\n` +
          (data.result ? `It might be: ${data.result}.\n` : "") +
          `Please try uploading another image from a different angle or in better lighting.`;

        if (data.uncertainty_gap !== undefined && data.uncertainty_gap < 0.01) {
          messageText += `\n\nThe model was uncertain between multiple degrees.`;
        }
      }

      setMessages((prev) => [...prev, { text: messageText, fromUser: false }]);
      setIsFinalDecision(data.has_decision);
      setHistory((prev) => [...prev, "Image uploaded"]);

      if (data.has_decision) {
        setTreatmentParams({
          caseType: data.result,
          degree: data.degree ?? undefined,
        });
        setShowImageCapture(false);
      } else {
        setShowImageCapture(true);
      }
    } catch (err) {
      console.error("Failed to send image:", err.message);
      setMessages((prev) => [
        ...prev,
        { text: `Image upload failed: ${err.message}`, fromUser: false },
      ]);
    }
  };

  return (
    <div>
      <button onClick={handleOpenFileDialog}>Upload from Computer</button>
      <button onClick={handleStartCamera}>Take a Picture</button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showCamera && (
        <div>
          <video
            ref={videoRef}
            autoPlay
            style={{ width: "100%", maxWidth: "400px" }}
          />
          <button onClick={handleTakePhoto}>Capture</button>
          <button onClick={stopCamera} style={{ marginLeft: "10px" }}>Cancel</button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {preview && (
        <div style={{ marginTop: "1rem" }}>
          <strong>Preview:</strong>
          <br />
          <img src={preview} alt="Preview" style={{ maxWidth: "100%" }} />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

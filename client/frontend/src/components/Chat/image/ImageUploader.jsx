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
    setAmbulance_flag,
    setIsFinalDecision,
    setTreatmentParams,
    setShowImageCapture,
    history,
    setHistory,
  } = useContext(ChatContext);
  useEffect(() => {
    const startStream = async () => {
      if (!showCamera || !videoRef.current) return;

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        console.error("Failed to access camera:", err);
        alert("Camera access denied or not available.");
      }
    };

    startStream();
  }, [showCamera]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      await sendImageToServer(file, imageUrl);
    }
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current.click();
  };
  const handleStartCamera = () => {
    setShowCamera(true); // רק מפעיל את התצוגה, בלי לגשת לוידאו עדיין
  };

  const handleTakePhoto = async () => {
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
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" }); // תני שם ברור עם סיומת

      const imageUrl = URL.createObjectURL(blob);
      setPreview(imageUrl);
      await sendImageToServer(file, imageUrl); // שולחים File ולא Blob
      stopCamera();
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
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
      //cc
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Image upload error:", errorText);
        setMessages((prev) => [
          ...prev,
          { text: `Image upload failed: ${errorText}`, fromUser: false },
        ]);
      } else {
        const data = await res.json();
        console.log("Image uploaded and processed:", data);

        setMessages((prev) => [
          ...prev,
          { text: data.result || "Received response.", fromUser: false },
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
        setHistory((prev) => [...prev, "🖼️ Image uploaded"]);
        if (data.has_decision) {
          setTreatmentParams({
            caseType: data.result,
            degree: data.degree ?? undefined,
          });
        }

        // במקרה והתגובה לא דורשת תמונה נוספת
        if (
          !(
            data.result &&
            data.result.toLowerCase().includes("burns") &&
            data.result.toLowerCase().includes("awaiting image")
          )
        ) {
          setShowImageCapture(false);
        }
      }
    } catch (err) {
      console.error("Failed to send image:", err.message);
      setMessages((prev) => [
        ...prev,
        { text: `Image upload failed: ${err.message}`, fromUser: false },
      ]);
    }
  };

  //       if (!res.ok) {
  //         const errorText = await res.text();
  //         console.error("Image upload error:", errorText);
  //       } else {
  //         console.log("Image uploaded successfully");
  //       }
  //     } catch (err) {
  //       console.error("Failed to send image:", err.message);
  //     }
  //   };

  useEffect(() => {
    return () => stopCamera(); // Clean up on unmount
  }, []);

  return (
    <div>
      <button onClick={handleOpenFileDialog}>📁 Upload from Computer</button>
      <button onClick={handleStartCamera}>📷 Take a Picture</button>

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
          <button onClick={handleTakePhoto}>📸 Capture</button>
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

import React, { useRef, useState, useEffect } from "react";

const ImageUploader = ({ onImageSend }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  

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

  const handleStartCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Failed to access camera:", err);
    }
  };

  const handleTakePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setPreview(imageUrl);
      await sendImageToServer(blob, imageUrl);
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Image upload error:", errorText);
      } else {
        console.log("Image uploaded successfully");
      }
    } catch (err) {
      console.error("Failed to send image:", err.message);
    }
  };

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
          <video ref={videoRef} autoPlay style={{ width: "100%", maxWidth: "400px" }} />
          <button onClick={handleTakePhoto}>📸 Capture</button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {preview && (
        <div style={{ marginTop: "1rem" }}>
          <strong>Preview:</strong><br />
          <img src={preview} alt="Preview" style={{ maxWidth: "100%" }} />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

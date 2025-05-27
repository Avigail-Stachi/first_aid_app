
// import React, { useState, useRef, useEffect } from "react";

// function ImageCapture({ onCapture, onCancel }) {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [stream, setStream] = useState(null);

//   const captureImage = () => {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     if (!video || !canvas) return;
//     const context = canvas.getContext("2d");
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     context.drawImage(video, 0, 0, canvas.width, canvas.height);

//     canvas.toBlob(
//       (blob) => {
// if (blob) {
//   sendImageToParent(blob);
// } else {
//   console.error("Failed to convert canvas to blob");
// }
//       },


//       "image/jpeg", 0.95
//     );
//   };

//  const sendImageToParent = (blob) => {
//     const formData = new FormData();
//     formData.append("image", blob, "burn.jpg");

//     console.log("Image captured and added to FormData:", formData);
//     if (onCapture) onCapture(blob);
//   };

//   useEffect(() => {
//     let isMounted = true;

//     const startCamera = async () => {
//       try {
//         const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

//         if (isMounted && videoRef.current) {
//           videoRef.current.srcObject = mediaStream;
//           videoRef.current.onloadedmetadata = () => {
//             videoRef.current.play();
//           };

//           setStream(mediaStream);
//         }
//       } catch (err) {
//         console.error("Error accessing camera:", err);
//       }
//     };

//     startCamera();

//     return () => {
//       isMounted = false;
//       if (stream) {
//         stream.getTracks().forEach((track) => track.stop());
//       } else if (videoRef.current && videoRef.current.srcObject) {
//         videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [stream]);

//   return (
//     <div>
//       <video
//         ref={videoRef}
//         style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", boxShadow: "0 0 10px rgba(0,0,0,0.3)" }}
//         autoPlay
//         muted
//         playsInline
//       />
//       <canvas ref={canvasRef} style={{ display: "none" }} />
//       <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
//         <button onClick={captureImage}>Take a Picture</button>
//         <button onClick={onCancel}>Cancel</button>
//       </div>
//     </div>
//   );
// }

// export default ImageCapture;
// components/ImageCapture.jsx
import React, { useRef, useEffect, useState } from "react";

function ImageCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log("ImageCapture mounted");

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
            } catch (err) {
              console.error("Video play error:", err);
            }
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }

    startCamera();

    return () => {
      // ניקוי וסגירת המצלמה כשמתנתקים מהרכיב
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("image", blob, "burn.jpg");

      try {
        setUploading(true);
        const res = await fetch(`${process.env.REACT_APP_API_URL}/upload-image`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Error: ${res.status} ${text}`);
        }

        const result = await res.json();
        console.log("Image result:", result);
        alert("Image sent successfully");

        // אם תרצי להעביר את התוצאה להורה:
        if (onCapture) onCapture(result);

      } catch (err) {
        console.error("Error uploading image:", err);
        alert("Failed to upload image");
      } finally {
        setUploading(false);
      }
    }, "image/jpeg");
  };

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", boxShadow: "0 0 10px rgba(0,0,0,0.3)" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
        <button onClick={captureImage} disabled={uploading}>
          {uploading ? "Uploading..." : "Take a Picture"}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default ImageCapture;


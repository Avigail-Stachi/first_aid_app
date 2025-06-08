

import React, { useRef, useState, useEffect, useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";

const ImageUploader = ({ onImageSend }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const {
    setMessages,
    setIsFinalDecision,
    setTreatmentParams,
    setShowImageCapture,
    setHistory,
  } = useContext(ChatContext);

  useEffect(() => {
    if (!showCamera || !videoRef.current) return;

    let activeStream = null;

    const startStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        activeStream = mediaStream;
      } catch (err) {
        console.error("Failed to access camera:", err);
        alert("Camera access denied or not available.");
        setShowCamera(false);
      }
    };

    startStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
      if (preview && !imageFile) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    };
  }, [showCamera, imageFile, preview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
    setImageFile(file);
    stopCamera();
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleStartCamera = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageFile(null);
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
      setImageFile(file);
      stopCamera();
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleSendImage = async () => {
    if (!imageFile) {
      alert("Please select or capture an image first.");
      return;
    }
    setIsSending(true);
    onImageSend(preview);

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/upload-burn-image-faster`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      console.log("Image uploaded and processed (Faster R-CNN):", data);

      if (!res.ok) {
        const errorText = data.detail || "Unknown error";
        console.error("Image upload error:", errorText);
        setMessages((prev) => [
          ...prev,
          { text: `Image upload failed: ${errorText}`, fromUser: false },
        ]);

        setTreatmentParams({
          caseType: "",
          degree: undefined,
          hasImageDiagnosis: false,
          identifiedDegrees: [],
          serverWarning: undefined,
          resultAwaitingImage: false,
          predictedImageBase64: null,
        });
        setIsFinalDecision(false);
        setShowImageCapture(true);
        if (preview) {
          URL.revokeObjectURL(preview);
          setPreview(null);
          setImageFile(null);
        }
        return;
      }

      const identifiedDegrees = (data.detected_objects || [])
        .map((obj) => obj.label.replace("degree_", ""))
        .filter((label) => label !== "__background__");
      let messageText = "";

      if (identifiedDegrees.length > 0) {
        messageText =
          `Detected burn types:\n` +
          identifiedDegrees.map((degree) => `• Degree ${degree}`).join("\n");
        if (data.warning) {
          messageText += `\n\n⚠️ ${data.warning}`;
        }
      } else {
        messageText =
          `⚠️ We could not determine the burn severity with high confidence.\n` +
          (data.warning ? `Warning: ${data.warning}\n` : "") +
          `Please try uploading another image from a different angle or in better lighting.`;
      }
      setMessages((prev) => [
        ...prev,
        { text: messageText, fromUser: false },
        ...(data.predicted_image_base64
          ? [
              {
                text: "Detected image:",
                fromUser: false,
                isPredictedImage: true,
                imageUrl: `data:image/jpeg;base64,${data.predicted_image_base64}`,
              },
            ]
          : []),
      ]);
      setHistory((prev) => [...prev, "🖼️ Image uploaded"]);

      const newTreatmentParams = {
        caseType: "burns",
        hasImageDiagnosis: true,
        identifiedDegrees: identifiedDegrees,
        degree: undefined,
        serverWarning: data.warning,
        resultAwaitingImage:
          data.result && data.result.toLowerCase().includes("awaiting image"),
        predictedImageBase64: data.predicted_image_base64 || null,
      };
      setTreatmentParams(newTreatmentParams);

      setIsFinalDecision(
        !data.warning &&
          !newTreatmentParams.resultAwaitingImage &&
          identifiedDegrees.length > 0
      );

      setShowImageCapture(
        !!data.warning || newTreatmentParams.resultAwaitingImage
      );
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
        setImageFile(null);
      }
    } catch (err) {
      console.error("Failed to send image:", err.message);
      setMessages((prev) => [
        ...prev,
        { text: `Image upload failed: ${err.message}`, fromUser: false },
      ]);

      setTreatmentParams({
        caseType: "",
        degree: undefined,
        hasImageDiagnosis: false,
        identifiedDegrees: [],
        serverWarning: undefined,
        resultAwaitingImage: false,
        predictedImageBase64: null,
      });
      setIsFinalDecision(false);
      setShowImageCapture(true);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
        setImageFile(null);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setImageFile(null);
    setShowImageCapture(true);
  };

  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginTop: "15px",
      }}
    >
      <h3>Upload/Capture Image</h3>
      <button onClick={handleOpenFileDialog} disabled={showCamera || isSending}>
        📁 Upload from Computer
      </button>
      <button
        onClick={handleStartCamera}
        disabled={showCamera || isSending}
        style={{ marginLeft: "10px" }}
      >
        📷 Take a Picture
      </button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={isSending}
      />

      {showCamera && (
        <div style={{ marginTop: "15px" }}>
          <video
            ref={videoRef}
            autoPlay
            style={{
              width: "100%",
              maxWidth: "400px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <button onClick={handleTakePhoto} disabled={isSending} style={{ marginTop: "10px" }}>
            📸 Capture
          </button>
          <button onClick={stopCamera} disabled={isSending} style={{ marginLeft: "10px" }}>
            ✖️ Cancel Camera
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {preview && (
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid #eee",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <strong>Preview:</strong>
          <br />
          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
              margin: "10px 0",
            }}
          />
          <button onClick={handleSendImage} disabled={isSending} style={{ marginTop: "10px" }}>
            {isSending ? "Sending..." : "📩 Send Image"}
          </button>
          <button
            onClick={handleCancelPreview}
            disabled={isSending}
            style={{ marginLeft: "10px", marginTop: "10px" }}
          >
            🗑️ Cancel Preview
          </button>
        </div>
      )}
      {isSending && <p>Uploading and processing image...</p>}
    </div>
  );
};

export default ImageUploader;
      // let messageText = "";

      // if (data.has_decision) {
      //   if (Array.isArray(data.result)) {
      //     messageText =
      //       `Detected ${data.result.length} injuries:\n` +
      //       data.result.map((item) => `• ${item.type} (Degree ${item.degree})`).join("\n");
      //   } else {
      //     messageText = `Detected injury: ${data.result} ${data.degree ? `(Degree ${data.degree})` : ""}`;
      //   }
      // } else {
      //   messageText = `Uncertain result. ${
      //     data.result ? "Possible type: " + data.result + "." : ""
      //   } Please provide another image for better assessment.`;
      // }
      

      //     if (
      //       data.positive_classes_names &&
      //       data.positive_classes_names.length > 0
      //     ) {
      //       setTreatmentParams({
      //         caseType: data.positive_classes_names,
      //         // במידה ויש צורך בדירוג, צריך להעביר אותו מהשרת (כרגע לא מוגדר)
      //       });
      //       setShowImageCapture(false);
      //     } else {
      //       setShowImageCapture(true);
      //     }

      //   } catch (err) {
      //     console.error("Failed to send image:", err.message);
      //     setMessages((prev) => [
      //       ...prev,
      //       { text: `Image upload failed: ${err.message}`, fromUser: false },
      //     ]);
      //   }
      // };

      //const identifiedDegreesFromImage = data.positive_classes_names || [];

    

  //     if (data.has_decision) {
  //       if (Array.isArray(data.result)) {
  //         messageText =
  //           `🩺 We detected ${data.result.length} burn injuries in the image:\n\n` +
  //           data.result
  //             .map((item, idx) => `• Burn #${idx + 1}: Degree ${item.degree}`)
  //             .join("\n") +
  //           `\n\nIf you believe one is missing, try uploading a clearer image.`;
  //       } else {
  //         messageText = `🩺 We detected one burn injury${data.degree ? ` (Degree ${data.degree})` : ""}.`;
  //       }
  //     } else {
  //       messageText =
  //         `⚠️ We could not determine the burn severity with high confidence.\n` +
  //         (data.result
  //           ? `It might be: ${data.result}.\n`
  //           : "") +
  //         `Please try uploading another image from a different angle or in better lighting.`;
  //     }

  //     setMessages((prev) => [...prev, { text: messageText, fromUser: false }]);
  //     setIsFinalDecision(data.has_decision);
  //     setHistory((prev) => [...prev, "🖼️ Image uploaded"]);

  //     if (data.has_decision) {
  //       setTreatmentParams({
  //         caseType: data.result,
  //         degree: data.degree ?? undefined,
  //       });
  //       setShowImageCapture(false);
  //     } else {
  //       setShowImageCapture(true);
  //     }
  //   } catch (err) {
  //     console.error("Failed to send image:", err.message);
  //     setMessages((prev) => [
  //       ...prev,
  //       { text: `Image upload failed: ${err.message}`, fromUser: false },
  //     ]);
  //   }
  // };

//   return (
//     <div>
//       <button onClick={handleOpenFileDialog}>📁 Upload from Computer</button>
//       <button onClick={handleStartCamera}>📷 Take a Picture</button>

//       <input
//         type="file"
//         accept="image/*"
//         ref={fileInputRef}
//         style={{ display: "none" }}
//         onChange={handleFileChange}
//       />

//       {showCamera && (
//         <div>
//           <video
//             ref={videoRef}
//             autoPlay
//             style={{ width: "100%", maxWidth: "400px" }}
//           />
//           <button onClick={handleTakePhoto}>📸 Capture</button>
//           <button onClick={stopCamera} style={{ marginLeft: "10px" }}>
//             ✖️ Cancel
//           </button>
//         </div>
//       )}

//       <canvas ref={canvasRef} style={{ display: "none" }} />

//       {preview && (
// <div
//           style={{
//             marginTop: "1rem",
//             border: "1px solid #eee",
//             padding: "10px",
//             borderRadius: "8px",
//           }}
//         >          <strong>Preview:</strong>
//           <br />
//           <img src={preview} alt="Preview" style={{ maxWidth: "100%" }} />
//         </div>
//       )}
//        {isSending && <p>Uploading and processing image...</p>}
//     </div>
//   );
// };

// export default ImageUploader;

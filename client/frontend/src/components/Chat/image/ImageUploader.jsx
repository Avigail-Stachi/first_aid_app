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
    //history,
    setHistory,
  } = useContext(ChatContext);

  // התחלת זרם המצלמה כשמציגים את הוידאו
  // useEffect(() => {
  //   const startStream = async () => {
  //     if (!showCamera || !videoRef.current) return;

  //     try {
  //       const mediaStream = await navigator.mediaDevices.getUserMedia({
  //         video: true,
  //       });
  //       videoRef.current.srcObject = mediaStream;
  //       setStream(mediaStream);
  //     } catch (err) {
  //       console.error("Failed to access camera:", err);
  //       alert("Camera access denied or not available.");
  //       setShowCamera(false);
  //     }
  //   };

  //   startStream();

  //   // ניקוי הזרם והpreview כשמתפרקים או כש-showCamera משתנה
  //   return () => {
  //     if (stream) {
  //       stream.getTracks().forEach((track) => track.stop());
  //       setStream(null);
  //     }
  //     if (preview) {
  //       URL.revokeObjectURL(preview);
  //       setPreview(null);
  //     }
  //   };
  // }, [showCamera]);
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
        activeStream = mediaStream; // שמירת הזרם המקומי
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
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    };
  }, [showCamera, preview]);

  // טיפול בבחירת קובץ מהמחשב
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ניקוי קישור preview קודם
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

  // צילום תמונה מהוידאו
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

      // ניקוי preview קודם
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(blob);

      setPreview(imageUrl);
      await sendImageToServer(file, imageUrl);
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

  // שליחת התמונה לשרת ועיבוד התגובה
  const sendImageToServer = async (fileOrBlob, previewUrl) => {
    onImageSend(previewUrl);

    const formData = new FormData();
    formData.append("image", fileOrBlob);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/upload-burn-image-faster`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
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
        return;
      }

      const data = await res.json();
      console.log("Image uploaded and processed (Faster R-CNN):", data);
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
                isPredictedImage: true, // <--- שינוי
                imageUrl: `data:image/jpeg;base64,${data.predicted_image_base64}`, // <--- שינוי
              },
            ]
          : []),
      ]);
      setHistory((prev) => [...prev, "🖼️ Image uploaded"]);

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
        !data.warning && // אם אין אזהרה, זה נחשב ל"החלטה סופית"
          !newTreatmentParams.resultAwaitingImage && // אם לא ממתינים לתמונה נוספת
          identifiedDegrees.length > 0 // ואם זוהו דרגות
      );

      // נציג שוב את כפתורי לכידת התמונה רק אם יש אזהרה או אם ממתינים לתמונה נוספת
      setShowImageCapture(
        !!data.warning || newTreatmentParams.resultAwaitingImage
      );
    } catch (err) {
      console.error("Failed to send image:", err.message);
      setMessages((prev) => [
        ...prev,
        { text: `Image upload failed: ${err.message}`, fromUser: false },
      ]);
      // עדכון treatmentParams במקרה של כשל כללי בשליחה
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
    }
  };

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
          <button onClick={stopCamera} style={{ marginLeft: "10px" }}>
            ✖️ Cancel
          </button>
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

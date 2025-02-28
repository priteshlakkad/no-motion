import React, { useRef, useEffect, useState } from "react";
import './HandMotionDetector.css';

const HandMotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fileName, setFileName] = useState(""); // For orderId
  const [orderId, setOrderId] = useState(""); // Store the latest orderId
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };
    setupCamera();
  }, []);

  const handleRecording = () => {
    if (!fileName.trim()) {
      setMessage("⚠️ Please enter a filename first!");
      return;
    }
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (videoRef.current.srcObject) {
      const mediaRecorder = new MediaRecorder(videoRef.current.srcObject);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        downloadVideo();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setMessage("🎥 Recording started...");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setMessage("📥 Recording stopped, downloading...");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const downloadVideo = () => {
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const downloadName = fileName.trim() || "hand_detection_video";
    a.download = `${downloadName}.mp4`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOrderIdSubmit = (e) => {
    e.preventDefault();
    if (fileName.trim()) {
      // Stop the old recording and download it first
      if (isRecording) {
        stopRecording();
      }

      // Set the latest Order ID
      setOrderId(fileName.trim());
      setFileName(""); // Clear the input field after submitting

      // Start recording with the new order ID
      startRecording();
    }
  };

  const handleStopRecording = () => {
    // Stop the recording and download the video
    if (isRecording) {
      stopRecording();
    }

    // Clear the text input field when the button is clicked
    setFileName("");

    // Reset the order ID box in the right container after stopping
    setOrderId(""); 
  };

  return (
    <div className="container">
      <div className="content">
        {/* Left side container for the latest order ID */}
        <div className="order-id-container">
          {orderId && (
            <div className="order-id-box">
              <p><strong>Current Video Recording ID:</strong> {orderId}</p>
            </div>
          )}
        </div>

        {/* Center container for webcam feed */}
        {/* <div className="video-container"> */}
          <video ref={videoRef} autoPlay playsInline className="video-feed"></video>
        {/* </div> */}

        {/* Right side for Stop & Download with Order ID Design */}
        <div className="stop-id-container">
          <div className="order-id-box">
            <button className="stop-button" onClick={handleStopRecording}>Stop & Download</button>
          </div>
        </div>
      </div>

      {!isCameraReady && <p className="loading-text">Loading camera...</p>}
      {message && <div className="message-box">{message}</div>}

      <div className="text-box-container">
        <form onSubmit={handleOrderIdSubmit}>
          <input
            type="text"
            placeholder="Enter Order ID here..."
            className="text-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOrderIdSubmit(e)} // Trigger on Enter key
          />
        </form>
      </div>
    </div>
  );
};

export default HandMotionDetector;

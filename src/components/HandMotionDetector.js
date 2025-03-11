import React, { useRef, useEffect, useState } from "react";
import 'font-awesome/css/font-awesome.min.css';
import './HandMotionDetector.css'; // Import your CSS file

const HandMotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // Reference for the canvas to draw on
  const [fileName, setFileName] = useState(""); // For orderId
  const [orderId, setOrderId] = useState(""); // Store the latest orderId
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(""); // For the real-time clock
  const [recordingStartTime, setRecordingStartTime] = useState(null); // Recording start time
  const [elapsedTime, setElapsedTime] = useState(0); // Elapsed recording time

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsCameraReady(true);

            // Set canvas dimensions to match video dimensions
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          };
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };
    setupCamera();

    // Update the time every second
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Draw the video, text, and overlays on the canvas
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      const draw = () => {
        // Draw the video frame on the canvas
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw the Current Order ID on the top-left side
        context.font = "30px Arial";
        context.fillStyle = "red";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(`Order ID: ${orderId || "N/A"}`, 20, 20);

        // Draw the current date-time on the top-right side
        context.font = "30px Arial";
        context.fillStyle = "red";
        context.textAlign = "right";
        context.textBaseline = "top";
        context.fillText(currentTime, canvasRef.current.width - 20, 20); // Top-right corner

        if (isRecording) {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          setElapsedTime(elapsed);
        }

        requestAnimationFrame(draw);
      };

      draw();
    }
  }, [isRecording, recordingStartTime, currentTime, orderId]);

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
    if (canvasRef.current) {
      const stream = canvasRef.current.captureStream(30); // Capture canvas stream at 30fps
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        downloadVideo();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingStartTime(Date.now()); // Store the start time
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
      if (isRecording) {
        stopRecording();
      }
      setOrderId(fileName.trim());
      setFileName("");
      startRecording();
    }
  };

  const handleStopRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setFileName("");
    setOrderId(""); 
  };

  return (
    <div className="container">
      <div className="content">
        <div className="order-id-container">
          <div className="order-id-box">
            <p><strong>Current Order ID:</strong> {orderId || "N/A"}</p>
          </div>
        </div>
  
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline className="video-feed"></video>
          
          {isRecording && (
            <div className="recording-icon"></div>
          )}
  
          <canvas
            ref={canvasRef}
            className="video-canvas" // Add a class for CSS styling
          />
        </div>
  
        <div className="stop-id-container">
          <div className="order-id-box">
            <button className="stop-button" onClick={handleStopRecording}>Stop & Download</button>
          </div>
        </div>
      </div>

      {message && <div className="message-box">{message}</div>}
  
      <div className="text-box-container">
        <form onSubmit={handleOrderIdSubmit}>
          <input
            type="text"
            placeholder="Enter Order ID here..."
            className="text-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOrderIdSubmit(e)} 
          />
        </form>
      </div>
    </div>
  );
};

export default HandMotionDetector;
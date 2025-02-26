import React, { useRef, useEffect, useState } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

const HandMotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fileName, setFileName] = useState(null); // Add this state
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [model, setModel] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [handStartTime, setHandStartTime] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
        }
      );
      setModel(detector);
    };
    loadModel();
  }, []);

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

  useEffect(() => {
    if (!model || !isCameraReady) return;

    let frameId;
    const detectHands = async () => {
      if (videoRef.current && model) {
        try {
          const hands = await model.estimateHands(videoRef.current);
          drawHands(hands);

          const now = Date.now();

          if (hands.length === 1 && isHandOpen(hands[0])) {
            if (!handStartTime) {
              setHandStartTime(now); // Start timing when a hand is detected
            } else if (now - handStartTime >= 1000) { // Hold for 1 second
              if (now - lastDetectionTime > 5000) { // Ensure 5-second gap
                handleRecording();
                setLastDetectionTime(now);
                setHandStartTime(null); // Reset hand detection timer
              }
            }
          } else {
            setHandStartTime(null); // Reset if no hand is detected
          }
        } catch (error) {
          console.error("Error detecting hands:", error);
        }
        frameId = requestAnimationFrame(detectHands);
      }
    };
    detectHands();

    return () => cancelAnimationFrame(frameId);
  }, [model, isCameraReady, lastDetectionTime, isRecording, handStartTime]);

  const isHandOpen = (hand) => {
    if (!hand.keypoints || hand.keypoints.length < 21) return false;
    const fingers = {
      thumb: [hand.keypoints[1], hand.keypoints[2], hand.keypoints[3], hand.keypoints[4]],
      index: [hand.keypoints[5], hand.keypoints[6], hand.keypoints[7], hand.keypoints[8]],
      middle: [hand.keypoints[9], hand.keypoints[10], hand.keypoints[11], hand.keypoints[12]],
      ring: [hand.keypoints[13], hand.keypoints[14], hand.keypoints[15], hand.keypoints[16]],
      pinky: [hand.keypoints[17], hand.keypoints[18], hand.keypoints[19], hand.keypoints[20]],
    };

    return Object.values(fingers).every((finger) => {
      const [mcp, pip, dip, tip] = finger;
      return tip.y < pip.y && tip.y < dip.y && tip.y < mcp.y; 
    });
  };

  const drawHands = (hands) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    hands.forEach((hand) => {
      hand.keypoints.forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      });
    });
  };

  const handleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!fileName || !fileName.trim()) {
      setMessage("⚠️ Please enter a filename first!");
      // Play warning sound
        return;
    }
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
    a.download = `${downloadName}.webm`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    setFileName("");
  };

  return (
    <div className="container">
      <h1>Hand Detection & Video Recorder</h1>
      <div className="video-container">
        <video ref={videoRef} width="640" height="480" autoPlay playsInline className="video-feed"></video>
        <canvas ref={canvasRef} width="640" height="480" className="video-overlay"></canvas>
       
      </div>
      {!isCameraReady && <p className="loading-text">Loading camera...</p>}
      {message && <div className="message-box">{message}</div>}
      <div className="text-box-container">
        <input
          type="text"
          placeholder="Enter filename here..."
          className="text-input"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </div>
    </div>
  );
};

export default HandMotionDetector;

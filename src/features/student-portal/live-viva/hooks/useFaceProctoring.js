import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { estimateGaze } from "../utils/gazeEstimator";

/**
 * useFaceProctoring Hook
 * Uses Google MediaPipe FaceLandmarker for real-time head movement and cheating detection.
 * 
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Reference to the webcam HTMLVideoElement
 * @param {Object} options - Configuration options
 * @param {Function} options.onViolation - Callback fired when a sustained violation occurs (type, details)
 * @param {number} [options.lookAwayThresholdMs=2500] - Duration in ms before head turn is flagged as violation
 * @param {number} [options.absenceThresholdMs=3000] - Duration in ms before missing face is flagged
 * @param {number} [options.multipleFacesThresholdMs=1200] - Duration in ms before multiple faces are flagged
 */
export function useFaceProctoring(videoRef, options = {}) {
  const {
    onViolation,
    lookAwayThresholdMs = 2500,
    absenceThresholdMs = 3000,
    multipleFacesThresholdMs = 1200,
    gazeThresholdMs = 2200,
  } = options;

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [proctorStatus, setProctorStatus] = useState("INITIALIZING"); // "INITIALIZING" | "NORMAL" | "CAUTION" | "VIOLATION"
  const [proctorLabel, setProctorLabel] = useState("Initializing Proctor AI...");
  const [faceCount, setFaceCount] = useState(0);
  const [gazeState, setGazeState] = useState({
    direction: "CENTER",
    label: "Focused on Screen",
    hgr: 0.5,
    vgr: 0.5,
    isBlinking: false,
    isLookingAway: false,
  });

  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // Infraction tracking refs
  const currentInfractionRef = useRef(null); // { type, label, startTime }
  const violationFiredRef = useRef(false);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isMounted = true;

    async function loadLandmarker() {
      try {
        setIsModelLoading(true);
        setModelError(null);

        // Fetch vision WASM files from Google CDN
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm" // literal-ok
        );

        if (!isMounted) return;

        // Try GPU delegate first, fallback to CPU if GPU not supported
        try {
          landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", // literal-ok
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 2,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
          });
        } catch (gpuErr) {
          console.warn("[MediaPipe] GPU delegate failed, falling back to CPU:", gpuErr);
          landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", // literal-ok
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 2,
            outputFaceBlendshapes: true,
          });
        }

        if (isMounted) {
          setIsModelLoading(false);
          setProctorStatus("NORMAL");
          setProctorLabel("Proctor Active: Face Centered");
        }
      } catch (err) {
        console.error("[MediaPipe] Failed to initialize FaceLandmarker:", err);
        if (isMounted) {
          setIsModelLoading(false);
          setModelError(err.message || "Failed to load face detection model");
          setProctorStatus("ERROR");
          setProctorLabel("Proctor Warning: Offline");
        }
      }
    }

    loadLandmarker();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (_) {}
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    let animId;

    const renderLoop = () => {
      const video = videoRef?.current;

      if (
        video &&
        video.readyState >= 2 &&
        landmarkerRef.current &&
        !video.paused &&
        !video.ended
      ) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const results = landmarkerRef.current.detectForVideo(video, performance.now());
            evaluateFrame(results);
          } catch (e) {
            // Silently ignore occasional frame drop
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
      animationFrameRef.current = animId;
    };

    animId = requestAnimationFrame(renderLoop);
    animationFrameRef.current = animId;

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [videoRef, isModelLoading]);

  // Analyze detection results
  const evaluateFrame = useCallback((results) => {
    const faces = results.faceLandmarks || [];
    const count = faces.length;
    setFaceCount(count);

    const now = Date.now();

    // -------------------------------------------------------------
    // Condition 1: Face Absent
    // -------------------------------------------------------------
    if (count === 0) {
      handleCandidateInfraction("FACE_ABSENT", "No face detected in webcam", absenceThresholdMs, now);
      return;
    }

    // -------------------------------------------------------------
    // Condition 2: Multiple Faces Detected
    // -------------------------------------------------------------
    if (count > 1) {
      handleCandidateInfraction("MULTIPLE_FACES", "Multiple faces detected", multipleFacesThresholdMs, now);
      return;
    }

    // -------------------------------------------------------------
    // Condition 3: Head Pose & Angle Evaluation (Single Face)
    // -------------------------------------------------------------
    const lm = faces[0];
    const nose = lm[1];        // Nose Tip
    const leftCheek = lm[234];  // Left Face Edge
    const rightCheek = lm[454]; // Right Face Edge
    const forehead = lm[10];    // Glabella / Upper Forehead
    const chin = lm[152];       // Chin Tip

    // Yaw calculation (Horizontal head turn)
    const distCheeks = Math.abs(rightCheek.x - leftCheek.x) || 0.001;
    const yawRatio = (nose.x - leftCheek.x) / distCheeks;

    // Pitch calculation (Vertical head nod / looking down at desk)
    const distFaceY = Math.abs(chin.y - forehead.y) || 0.001;
    const pitchRatio = (nose.y - forehead.y) / distFaceY;

    // Thresholds:
    // Centered yawRatio is approx 0.50 (normal: 0.35 to 0.65)
    // Centered pitchRatio is approx 0.55 - 0.62 (looking down: > 0.74, looking up: < 0.40)
    const isLookingLeft = yawRatio < 0.34;
    const isLookingRight = yawRatio > 0.66;
    const isLookingDown = pitchRatio > 0.74;
    const isLookingUp = pitchRatio < 0.38;

    // Iris & Gaze Estimation
    const gaze = estimateGaze(lm, results.faceBlendshapes?.[0]?.categories);
    setGazeState(gaze);

    if (isLookingLeft) {
      handleCandidateInfraction("LOOKING_AWAY", "Head turned Left away from screen", lookAwayThresholdMs, now);
    } else if (isLookingRight) {
      handleCandidateInfraction("LOOKING_AWAY", "Head turned Right away from screen", lookAwayThresholdMs, now);
    } else if (isLookingDown) {
      handleCandidateInfraction("LOOKING_DOWN", "Head looking Down at desk / phone", lookAwayThresholdMs, now);
    } else if (isLookingUp) {
      handleCandidateInfraction("LOOKING_AWAY", "Head looking Up away from camera", lookAwayThresholdMs, now);
    } else if (gaze.isLookingAway) {
      // Head is facing camera, but eyes/iris are looking off-screen!
      handleCandidateInfraction("GAZE_DEVIATION", gaze.label, gazeThresholdMs, now);
    } else {
      // Normal head position & centered gaze
      clearInfraction();
    }
  }, [absenceThresholdMs, multipleFacesThresholdMs, lookAwayThresholdMs, gazeThresholdMs]);

  // Infraction debouncing and threshold verification
  const handleCandidateInfraction = (type, label, thresholdMs, now) => {
    if (!currentInfractionRef.current || currentInfractionRef.current.type !== type) {
      // Start tracking new candidate infraction
      currentInfractionRef.current = { type, label, startTime: now };
      violationFiredRef.current = false;
      setProctorStatus("CAUTION");
      setProctorLabel(`Caution: ${label}`);
      return;
    }

    const elapsed = now - currentInfractionRef.current.startTime;

    if (elapsed >= thresholdMs) {
      setProctorStatus("VIOLATION");
      setProctorLabel(`Violation: ${label}`);

      // Fire callback once per sustained violation period
      if (!violationFiredRef.current) {
        violationFiredRef.current = true;
        if (onViolation) {
          onViolation({
            type,
            label,
            durationMs: elapsed,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      // In caution period (warning before threshold)
      setProctorStatus("CAUTION");
      setProctorLabel(`Caution: ${label}`);
    }
  };

  const clearInfraction = () => {
    currentInfractionRef.current = null;
    violationFiredRef.current = false;
    setProctorStatus("NORMAL");
    setProctorLabel("Proctor Active: Face Centered");
  };

  return {
    isModelLoading,
    modelError,
    proctorStatus, // "INITIALIZING" | "NORMAL" | "CAUTION" | "VIOLATION" | "ERROR"
    proctorLabel,  // Human readable description
    faceCount,     // Number of detected faces
    gazeState,     // { direction, label, hgr, vgr, isBlinking, isLookingAway }
  };
}

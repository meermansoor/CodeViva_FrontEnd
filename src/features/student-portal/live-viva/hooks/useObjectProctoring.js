import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";

/**
 * Friendly display names for COCO classes
 */
const PROHIBITED_LABELS = {
  "cell phone": "Mobile Phone",
  "book": "Book / Notes",
  "laptop": "Secondary Laptop / Screen",
};

/**
 * useObjectProctoring Hook
 * Uses Google MediaPipe ObjectDetector (EfficientDet-Lite) to detect prohibited cheating
 * contraband (mobile phones, books/notes, secondary devices) in the student's webcam feed.
 * 
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Reference to the webcam video element
 * @param {Object} options - Configuration options
 * @param {Function} options.onObjectViolation - Fired when a prohibited item is sustained in frame
 * @param {number} [options.detectionIntervalMs=450] - Interval between object checks in ms (saves CPU)
 * @param {number} [options.confidenceThreshold=0.52] - Minimum confidence score (0-1)
 * @param {number} [options.sustainedThresholdMs=1000] - Duration item must remain in view before violation fires
 * @param {string[]} [options.prohibitedCategories] - Array of COCO categories to flag
 */
export function useObjectProctoring(videoRef, options = {}) {
  const {
    onObjectViolation,
    detectionIntervalMs = 450,
    confidenceThreshold = 0.52,
    sustainedThresholdMs = 1000,
    prohibitedCategories = ["cell phone", "book", "laptop"],
  } = options;

  const [isDetectorLoading, setIsDetectorLoading] = useState(true);
  const [detectorError, setDetectorError] = useState(null);
  const [detectedProhibited, setDetectedProhibited] = useState(null); // { name, category, score }

  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastCheckTimeRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  // Sustained tracking
  const activeViolationRef = useRef(null); // { category, name, startTime }
  const hasFiredViolationRef = useRef(false);

  // Initialize MediaPipe ObjectDetector
  useEffect(() => {
    let isMounted = true;

    async function initDetector() {
      try {
        setIsDetectorLoading(true);
        setDetectorError(null);

        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm" // literal-ok
        );

        if (!isMounted) return;

        const modelUrl = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite"; // literal-ok

        // Attempt GPU first, fallback to CPU
        try {
          detectorRef.current = await ObjectDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: modelUrl,
              delegate: "GPU",
            },
            scoreThreshold: 0.45,
            runningMode: "VIDEO",
            maxResults: 5,
          });
        } catch (gpuErr) {
          console.warn("[MediaPipe ObjectDetector] GPU failed, falling back to CPU:", gpuErr);
          detectorRef.current = await ObjectDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: modelUrl,
              delegate: "CPU",
            },
            scoreThreshold: 0.45,
            runningMode: "VIDEO",
            maxResults: 5,
          });
        }

        if (isMounted) {
          setIsDetectorLoading(false);
          console.log("[MediaPipe ObjectDetector] Initialized successfully");
        }
      } catch (err) {
        console.error("[MediaPipe ObjectDetector] Failed to initialize:", err);
        if (isMounted) {
          setIsDetectorLoading(false);
          setDetectorError(err.message || "Failed to load object detector model");
        }
      }
    }

    initDetector();

    return () => {
      isMounted = false;
      if (detectorRef.current) {
        try {
          detectorRef.current.close();
        } catch (_) {}
      }
    };
  }, []);

  // Frame processing loop with throttling to detectionIntervalMs
  useEffect(() => {
    let animId;

    const loop = (timestamp) => {
      const video = videoRef?.current;

      if (
        video &&
        video.readyState >= 2 &&
        detectorRef.current &&
        !video.paused &&
        !video.ended
      ) {
        // Run only once per detectionIntervalMs and if video frame advanced
        const timeSinceLastCheck = timestamp - lastCheckTimeRef.current;
        if (timeSinceLastCheck >= detectionIntervalMs && video.currentTime !== lastVideoTimeRef.current) {
          lastCheckTimeRef.current = timestamp;
          lastVideoTimeRef.current = video.currentTime;

          try {
            const results = detectorRef.current.detectForVideo(video, timestamp);
            evaluateDetections(results);
          } catch (e) {
            // Silently ignore dropped frame
          }
        }
      }

      animId = requestAnimationFrame(loop);
      animationFrameRef.current = animId;
    };

    animId = requestAnimationFrame(loop);
    animationFrameRef.current = animId;

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [videoRef, detectionIntervalMs, isDetectorLoading]);

  // Inspect detections for prohibited items
  const evaluateDetections = useCallback((results) => {
    const detections = results.detections || [];
    let topProhibitedMatch = null;

    for (const detection of detections) {
      for (const category of detection.categories || []) {
        const catName = (category.categoryName || "").toLowerCase();

        if (prohibitedCategories.includes(catName) && category.score >= confidenceThreshold) {
          if (!topProhibitedMatch || category.score > topProhibitedMatch.score) {
            topProhibitedMatch = {
              category: catName,
              name: PROHIBITED_LABELS[catName] || catName,
              score: Math.round(category.score * 100),
            };
          }
        }
      }
    }

    const now = Date.now();

    if (topProhibitedMatch) {
      if (!activeViolationRef.current || activeViolationRef.current.category !== topProhibitedMatch.category) {
        activeViolationRef.current = {
          category: topProhibitedMatch.category,
          name: topProhibitedMatch.name,
          startTime: now,
          score: topProhibitedMatch.score,
        };
        hasFiredViolationRef.current = false;
        setDetectedProhibited(topProhibitedMatch);
      } else {
        const elapsed = now - activeViolationRef.current.startTime;

        if (elapsed >= sustainedThresholdMs && !hasFiredViolationRef.current) {
          hasFiredViolationRef.current = true;
          setDetectedProhibited(topProhibitedMatch);

          if (onObjectViolation) {
            onObjectViolation({
              type: "OBJECT_DETECTED",
              objectName: topProhibitedMatch.name,
              category: topProhibitedMatch.category,
              confidence: topProhibitedMatch.score,
              label: `Prohibited item detected: ${topProhibitedMatch.name} (${topProhibitedMatch.score}%)`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } else {
      // Clear infraction if item no longer in view
      activeViolationRef.current = null;
      hasFiredViolationRef.current = false;
      setDetectedProhibited(null);
    }
  }, [confidenceThreshold, onObjectViolation, prohibitedCategories, sustainedThresholdMs]);

  return {
    isDetectorLoading,
    detectorError,
    detectedProhibited,              // null | { category, name, score }
    hasProhibitedItem: !!detectedProhibited,
  };
}

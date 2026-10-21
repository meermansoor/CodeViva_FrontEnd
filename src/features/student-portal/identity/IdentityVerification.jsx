import { ArrowRight, Camera, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { captureIdentityPhoto } from "./api/identityVerificationApi";
import "../styles/identity-verification.css";

const photoStorageKey = "codeviva-student-captured-photo";

export default function IdentityVerification({ onContinue }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(() => sessionStorage.getItem(photoStorageKey) || "");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Allow camera access to capture your identity photo.");
      }
    };

    if (!photo) startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [photo]);

  const handleCapture = async () => {
    if (photo) {
      sessionStorage.removeItem(photoStorageKey);
      setPhoto("");
      setError("");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      setError("Camera is still starting. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const result = await captureIdentityPhoto(canvas.toDataURL("image/jpeg", 0.9));
    sessionStorage.setItem(photoStorageKey, result.photo);
    setPhoto(result.photo);
    setError("");
    onContinue();
  };

  return (
    <section className="identity-card">
      <div className="identity-heading">
        <h1>Identity Verification</h1>
        <p>Please look directly at your webcam to verify student enrollment records.</p>
      </div>

      <div className="identity-camera">
        {photo ? (
          <img src={photo} alt="Captured student identity" />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline />
        )}
        <span className="camera-live"><i /> WEBCAM LIVE</span>
        {!photo && <div className="face-guide" aria-hidden="true"><span /><span /><span /><span /></div>}
      </div>

      <canvas ref={canvasRef} hidden />
      {error && <p className="identity-error" role="alert">{error}</p>}

      <div className="identity-progress-row">
        <div className="identity-progress"><span /></div>
        <strong>75%</strong>
      </div>

      <button className="identity-capture-button" type="button" onClick={handleCapture}>
        <Camera size={14} />
        {photo ? "Retake Photo" : "Capture & Continue"}
        {!photo && <ArrowRight size={14} />}
      </button>

      <p className="identity-note"><Check size={11} /> This verification data is mapped to secure ABET educational standards.</p>
    </section>
  );
}

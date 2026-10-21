import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { startScheduledViva } from "./api/vivaInstructionsApi";
import "../styles/viva-instructions.css";

export default function VivaInstructions({ onStart, courseName, totalQuestions, timeLimitMinutes }) {
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    // These API calls are dummy, you could also remove them or pass correct details
    const result = await startScheduledViva({
      code: "NET-401-FINAL",
      rollNumber: "2026-CS-4089",
    });
    setStarted(result.started);
    onStart();
  };

  return (
    <section className="instructions-card">
      <div className="instructions-heading">
        <h1>Viva Instructions &amp; Briefing</h1>
        <p>Please review the assessment framework carefully before beginning the oral examination.</p>
      </div>

      <div className="instruction-summary">
        <div>
          <span>COURSE NAME</span>
          <strong>{courseName}</strong>
        </div>
        <div>
          <span>QUESTIONS</span>
          <strong>{totalQuestions} Total</strong>
        </div>
        <div>
          <span>TIME LIMIT</span>
          <strong>{timeLimitMinutes} Minutes</strong>
        </div>
      </div>

      <div className="proctoring-guidelines">
        <strong>Strict Proctoring Guidelines:</strong>
        <ul>
          <li>Answer verbally after clicking the microphone recording button.</li>
          <li>No tab switching or browser resizing is permitted. Detections auto-flag assessment records.</li>
          <li>Webcam must remain completely active and your focus target must face the camera.</li>
          <li>You may skip questions, but you cannot revisit skipped modules after submission.</li>
        </ul>
      </div>

      <button className="instructions-action" type="button" onClick={handleStart}>
        {started ? "Viva Ready to Begin" : "Start Scheduled Viva"}
        <ArrowRight size={14} />
      </button>

      <p className="instructions-note">
        <CheckCircle2 size={11} /> By starting the viva, you agree to secure audio/video verification analysis metrics.
      </p>
    </section>
  );
}

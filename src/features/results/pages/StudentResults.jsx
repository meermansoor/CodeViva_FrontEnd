import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { endVivaSession } from "../../student-portal/live-viva/api/liveVivaApi";
import "../styles/student-results.css";

export default function StudentResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const results = location.state?.results;
  const [terminated, setTerminated] = useState(false);

  const terminateSession = async () => {
    if (terminated) return;
    await endVivaSession();
    setTerminated(true);
    navigate("/register", { replace: true });
  };

  const totalQuestions = results?.currentQuestion?.total || 10;
  
  let answeredCount = 0;
  let skippedCount = 0;
  let totalScore = 0;
  let totalMaxMarks = 0;

  if (results?.answersMap) {
    Object.values(results.answersMap).forEach(ans => {
      if (ans.status === "ANSWERED") {
        answeredCount++;
        totalScore += (ans.score || 0);
      }
      if (ans.status === "SKIPPED") skippedCount++;
      totalMaxMarks += (ans.max_marks || 0);
    });
  }

  const gradePercentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;
  
  const timeUsed = results?.elapsedTime 
    ? `${Math.floor(results.elapsedTime / 60)}:${String(Math.floor(results.elapsedTime % 60)).padStart(2, '0')}` 
    : '0:00';
    
  const totalTime = results?.timeLimitSec
    ? `${Math.floor(results.timeLimitSec / 60)}:${String(Math.floor(results.timeLimitSec % 60)).padStart(2, '0')}`
    : '10:00';

  const resultRows = [
    {
      icon: CheckCircle2,
      label: "Questions Answered",
      value: `${answeredCount} / ${totalQuestions}`,
      tone: "answered",
    },
    {
      icon: AlertTriangle,
      label: "Questions Skipped",
      value: `${skippedCount} / ${totalQuestions}`,
      tone: "skipped",
    },
    {
      icon: Clock3,
      label: "Time Used",
      value: `${timeUsed} of ${totalTime}`,
      tone: "time",
    },
  ];

  return (
    <main className="student-results-page">
      <section className="student-results-card">
        <div className="results-details">
          <span className="results-eyebrow">LIVE VIVA ASSESSMENT</span>
          <h1>Results</h1>
          <p className="results-subtitle">Your results during the live viva</p>
          <div className="result-rows">
            {resultRows.map(({ icon: Icon, label, value, tone }) => (
              <div className={`result-row ${tone}`} key={label}>
                <span className="result-row-icon"><Icon size={16} /></span>
                <strong>{label}</strong>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="results-meta">
            <span>Overall Evaluation</span>
            <span>Viva-Voce</span>
          </div>
          <button className="student-results-exit" type="button" onClick={terminateSession} disabled={terminated}>
            {terminated ? "Session Terminated" : "Exit & Finish Session"}
          </button>
        </div>

        <div className="results-visual">
          <div 
            className="confidence-chart" 
            role="img" 
            aria-label={`${gradePercentage} percent score`}
            style={{
              background: `conic-gradient(#5045e8 0deg ${(gradePercentage / 100) * 360}deg, #e5e8f0 ${(gradePercentage / 100) * 360}deg 360deg)`
            }}
          >
            <div className="confidence-chart-label"><strong>{gradePercentage}%</strong><span>GRADE</span></div>
          </div>
          <h2>AI Evaluator Grade</h2>
          <p>Based on keyword analysis and response accuracy</p>
        </div>
      </section>
    </main>
  );
}

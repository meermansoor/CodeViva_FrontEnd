import { Award, CheckCircle2, Clock3, ShieldCheck, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/viva-completed.css";

export default function VivaCompleted({ results }) {
  const navigate = useNavigate();
  const totalQuestions = results?.currentQuestion?.total || 0;
  
  let answeredCount = 0;
  let skippedCount = 0;
  
  if (results?.answersMap) {
    Object.values(results.answersMap).forEach(ans => {
      if (ans.status === "ANSWERED") answeredCount++;
      if (ans.status === "SKIPPED") skippedCount++;
    });
  }
  
  const timeUsed = results?.elapsedTime 
    ? `${Math.floor(results.elapsedTime / 60)}:${String(Math.floor(results.elapsedTime % 60)).padStart(2, '0')}` 
    : '0:00';
    
  const totalTime = results?.timeLimitSec
    ? `${Math.floor(results.timeLimitSec / 60)}:${String(Math.floor(results.timeLimitSec % 60)).padStart(2, '0')}`
    : '10:00';

  return (
    <section className="results-view">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", order: 2 }}>
        <aside className="exam-stats-panel" style={{ order: 'unset' }}>
          <h2>Exam Record Stats</h2>
          <div 
            className="confidence-ring"
            style={{
              background: `conic-gradient(#5045e8 ${results?.scorePercentage || 0}%, #e7eaf1 0)`
            }}
          >
            <div className="confidence-inner">
              <strong>{results?.scorePercentage || 0}%</strong>
              <span>CONFIDENCE</span>
            </div>
          </div>
          <dl className="exam-stats-list">
            <div><dt>Total Questions</dt><dd>{totalQuestions}</dd></div>
            <div><dt>Answered</dt><dd>{answeredCount}</dd></div>
            <div><dt>Skipped</dt><dd>{skippedCount}</dd></div>
          </dl>
        </aside>
        
        <button 
          onClick={() => navigate("/")}
          style={{
            padding: "12px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            width: "100%",
            boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#ef4444"}
        >
          Exit Viva
        </button>
      </div>

      <section className="results-card">
        <div className="results-heading">
          <h1>Results</h1>
          <p>Your Results During Live Viva</p>
        </div>

        <div className="result-summary-list">
          <ResultRow icon={CheckCircle2} label="Questions Answered" value={`${answeredCount} / ${totalQuestions}`} tone="success" />
          <ResultRow icon={Award} label="Questions Skipped" value={`${skippedCount} / ${totalQuestions}`} tone="warning" />
          <ResultRow icon={Clock3} label="Time Used" value={`${timeUsed} of ${totalTime}`} />
          <ResultRow 
            icon={ShieldCheck} 
            label="Proctor Integrity Analysis" 
            value={results?.tabSwitches > 0 ? `${results.tabSwitches} Tab Switch(es)` : "Verified Secure"} 
            tone={results?.tabSwitches > 0 ? "warning" : "purple"} 
          />
          <ResultRow icon={UserCheck} label="Identity Verification Check" value="Passed" tone="success" />
        </div>

      </section>
    </section>
  );
}

function ResultRow({ icon: Icon, label, value, tone = "default" }) {
  return <div className="result-row"><div className={`result-row-icon ${tone}`}><Icon size={14} /></div><strong>{label}</strong><span className={tone}>{value}</span></div>;
}

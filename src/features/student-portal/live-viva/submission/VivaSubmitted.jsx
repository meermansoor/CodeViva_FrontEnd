import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/viva-submitted.css";

export default function VivaSubmitted({ results }) {
  const navigate = useNavigate();

  const duration = results?.elapsedTime 
    ? `${Math.floor(results.elapsedTime / 60)} minutes, ${Math.floor(results.elapsedTime % 60)} seconds` 
    : 'N/A';
    
  const rollNo = results?.studentInfo?.rollNo || 'Unknown';
  const name = results?.studentInfo?.name || 'Unknown';

  return (
    <section className="viva-submitted-card">
      <div className="submitted-icon"><CheckCircle2 size={25} /></div>
      <h1>Viva Successfully Submitted!</h1>
      <p>Best of Luck! Your oral response transcripts, environment webcam logs, and proctoring feed checks have been securely transmitted to the course database.</p>
      <dl>
        <div><dt>Roll Number / Student Name</dt><dd>{rollNo} / {name}</dd></div>
        <div><dt>Completed Date &amp; Time</dt><dd>{new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</dd></div>
        <div><dt>Evaluated Exam Duration</dt><dd>{duration}</dd></div>
      </dl>
      <div className="submitted-note">Evaluation results and graded syllabus matrices will be accessible shortly via your student dashboard.</div>
      <div className="submitted-actions">
        <button className="transcript-button" type="button" onClick={() => navigate("/student-results", { state: { results } })}>
          View Transcript
        </button>
        <button className="exit-portal-button" type="button" onClick={() => navigate("/login")}>
          Exit Portal
        </button>
      </div>
    </section>
  );
}

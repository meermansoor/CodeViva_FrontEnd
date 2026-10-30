import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { getSocket } from "../../../services/socket";
import IdentityVerification from "../identity/IdentityVerification";
import EnvironmentCheck from "../environment/EnvironmentCheck";
import VivaInstructions from "../instructions/VivaInstructions";
import LiveViva from "../live-viva/LiveViva";
import "../styles/student-portal.css";

export default function StudentPortal() {
  const [step, setStep] = useState(1);
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("roomCode") || "";
  const rollNo = searchParams.get("rollNo") || "";
  const name = searchParams.get("name") || "Sarah Smith";

  const [sessionId, setSessionId] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [isRoomValid, setIsRoomValid] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  
  // Room metadata for instructions
  const [courseName, setCourseName] = useState("Unknown Course");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);

  useEffect(() => {
    if (!roomCode) {
      setSessionError("No room code provided in URL.");
      setIsValidating(false);
      return;
    }
    axios.get(`http://localhost:5000/api/viva/room/${roomCode}?rollNo=${rollNo}`)
      .then(res => {
        if (res.data.valid) {
          setIsRoomValid(true);
          setCourseName(res.data.courseName);
          setTotalQuestions(res.data.totalQuestions);
          setTimeLimitMinutes(res.data.timeLimitMinutes);
        }
      })
      .catch(err => {
        setSessionError(err.response?.data?.error || "Invalid join code.");
      })
      .finally(() => {
        setIsValidating(false);
      });

    const socket = getSocket();
    if (roomCode) {
      socket.emit("room:join", { roomCode, role: "student" });
    }

    const handleRoomClosed = (data) => {
      if (data.roomCode === roomCode) {
        setIsRoomValid(false);
        setSessionError("The teacher has ended the exam room. Your session was terminated.");
        // Redirect them out completely
        window.location.href = "/register";
      }
    };

    socket.on('ROOM_CLOSED', handleRoomClosed);
    socket.on('room:closed', handleRoomClosed);

    return () => {
      if (roomCode) {
        socket.emit("room:leave", { roomCode });
      }
      socket.off('ROOM_CLOSED', handleRoomClosed);
      socket.off('room:closed', handleRoomClosed);
    };
  }, [roomCode]);

  const handleStartViva = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/viva/session/start", {
        roomCode, rollNo, name
      });
      if (res.data.success) {
        setSessionId(res.data.data.sessionId);
        setStep(4);
      }
    } catch (err) {
      setSessionError(err.response?.data?.error || "Failed to start session");
    }
  };

  if (isValidating) {
    return <main className="student-portal"><div style={{ padding: '2rem', textAlign: 'center' }}>Validating Room Code...</div></main>;
  }

  if (!isRoomValid) {
    return (
      <main className="student-portal">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          <h2>Access Denied</h2>
          <p>{sessionError}</p>
          <a href="/register">Go back to Join page</a>
        </div>
      </main>
    );
  }

  return (
    <main className="student-portal">
      {step < 4 && (
        <>
          <header className="student-portal-header">
            <strong>CodeViva Portal</strong>
            <span>Viva Code: {roomCode} | Roll No: {rollNo}</span>
          </header>
          <nav className="student-portal-steps" aria-label="Student portal progress">
            <span className={step >= 1 ? "active" : ""}>1 Identity Verification</span>
            <span className={step >= 2 ? "active" : ""}>2 Environment Check</span>
            <span className={step >= 3 ? "active" : ""}>3 Viva Instructions</span>
          </nav>
        </>
      )}
      {step === 1 && <IdentityVerification onContinue={() => setStep(2)} />}
      {step === 2 && <EnvironmentCheck onContinue={() => setStep(3)} />}
      {step === 3 && (
        <div>
          <VivaInstructions 
            onStart={handleStartViva} 
            courseName={courseName}
            totalQuestions={totalQuestions}
            timeLimitMinutes={timeLimitMinutes}
          />
          {sessionError && <div style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{sessionError}</div>}
        </div>
      )}
      {step === 4 && <LiveViva sessionId={sessionId} name={name} rollNo={rollNo} roomCode={roomCode} />}
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  HelpCircle,
  Square,
  BookOpen,
} from "lucide-react";

import "../styles/live-monitoring.css";

/* =========================================================
   LIVE MONITORING PAGE
========================================================= */

export default function LiveMonitoring() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [students, setStudents] = useState([]);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);

  /* =======================================================
     FETCH INITIAL DATA
  ======================================================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        if (!token) return;

        const [roomsRes, sessionsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/teacher/exam-rooms", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false, data: [] } })),
          axios.get("http://localhost:5000/api/teacher/sessions", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false, data: [] } }))
        ]);

        let loadedRooms = [];
        let allSessions = [];

        if (roomsRes.data.success) {
          loadedRooms = roomsRes.data.data;
        }

        if (sessionsRes.data.success) {
          allSessions = sessionsRes.data.data;
        }

        const enrichedRooms = loadedRooms.map(room => {
          const roomSessions = allSessions.filter(s => s.questionBankId?._id === room.questionBankId?._id);
          
          let waitingStudents = [];
          if (room.allowedStudents) {
             waitingStudents = room.allowedStudents
               .filter(ast => !roomSessions.find(rs => rs.studentInfo?.rollNo === ast.rollNo))
               .map(ast => ({
                 id: `wait-${ast.rollNo}`,
                 name: ast.name,
                 rollNo: ast.rollNo,
                 status: "Waiting",
                 question: "Queued",
                 remaining: "Not started",
                 risk: 0,
                 avatar: ast.name.substring(0, 2).toUpperCase()
               }));
          }

          const activeSessions = roomSessions.map(s => {
            const risk = s.proctoringLogs?.cheatingProbability || 0;
            return {
              id: s._id,
              name: s.studentInfo?.name || "Unknown",
              rollNo: s.studentInfo?.rollNo || "",
              status: s.status === 'COMPLETED' ? 'Completed' : 'In Progress',
              question: s.status === 'COMPLETED' ? 'Finished' : `Active`,
              remaining: s.status === 'COMPLETED' ? `Score: ${s.totalScore || 0}` : "In Session",
              risk: risk,
              avatar: (s.studentInfo?.name || "ST").substring(0, 2).toUpperCase()
            }
          });

          return {
            ...room,
            mappedStudents: [...activeSessions, ...waitingStudents]
          };
        });

        setRooms(enrichedRooms);
        if (enrichedRooms.length > 0) {
          setSelectedRoom(enrichedRooms[0]);
          setStudents(enrichedRooms[0].mappedStudents);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  /* =======================================================
     SOCKET.IO REAL-TIME UPDATES
  ======================================================== */
  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("teacher_live_update", (data) => {
      setRooms(prevRooms => {
        return prevRooms.map(room => {
          let newMapped = [...room.mappedStudents];
          
          if (data.type === 'SESSION_STARTED') {
             // The new session has started. We can remove them from 'Waiting' and add to 'In Progress'
             const waitIdx = newMapped.findIndex(s => s.rollNo === data.studentInfo?.rollNo && s.status === "Waiting");
             if (waitIdx !== -1) {
               newMapped[waitIdx] = {
                 ...newMapped[waitIdx],
                 id: data.sessionId, // upgrade ID to real session ID
                 status: "In Progress",
                 question: "Active",
                 remaining: "Just started"
               };
             } else {
               // They weren't in waiting list, just append
               newMapped.push({
                 id: data.sessionId,
                 name: data.studentInfo?.name || "Unknown",
                 rollNo: data.studentInfo?.rollNo || "",
                 status: "In Progress",
                 question: "Active",
                 remaining: "Just started",
                 risk: 0,
                 avatar: (data.studentInfo?.name || "ST").substring(0, 2).toUpperCase()
               });
             }
          } else if (data.type === 'SESSION_UPDATED') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId);
             if (idx !== -1) {
               const curr = data.sessionData.currentQuestion;
               newMapped[idx].question = `Q${curr?.index + 1}/${curr?.total}`;
               const scoreDisplay = data.currentScore !== undefined ? ` • Score: ${data.currentScore}` : '';
               newMapped[idx].remaining = `${data.sessionData.elapsedTime || 0}s${scoreDisplay}`;
               newMapped[idx].hasFlaggedReview = data.hasFlaggedReview || false;
               newMapped[idx].currentScore = data.currentScore || 0;
             }
          } else if (data.type === 'SESSION_COMPLETED') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId);
             if (idx !== -1) {
               newMapped[idx].status = "Completed";
               newMapped[idx].question = "Finished";
               newMapped[idx].remaining = `Score: ${data.totalScore}`;
             }
          } else if (data.type === 'PROCTOR_ALERT') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId);
             if (idx !== -1) {
               newMapped[idx].risk = data.cheatingProbability;
             }
          }
          
          return { ...room, mappedStudents: newMapped };
        });
      });
    });

    return () => socket.disconnect();
  }, []);

  /* =======================================================
     SYNC SELECTED ROOM STUDENTS
  ======================================================== */
  useEffect(() => {
    if (selectedRoom) {
      const updated = rooms.find(r => r._id === selectedRoom._id);
      if (updated) setStudents(updated.mappedStudents);
    }
  }, [rooms, selectedRoom]);

  /* =======================================================
     LIVE TIMER
  ======================================================== */
  useEffect(() => {
    if (sessionEnded) return;
    const timer = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionEnded]);

  const formattedElapsedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`;
  }, [elapsedSeconds]);

  /* =======================================================
     ACTIONS
  ======================================================== */
  const handleEndSession = async () => {
    if (!selectedRoom) return;
    const confirmed = window.confirm("Are you sure you want to end this exam room? New students will be blocked from joining.");
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem("teacherToken");
      const res = await axios.put(`http://localhost:5000/api/teacher/exam-rooms/${selectedRoom._id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSessionEnded(true);
      }
    } catch (err) {
      console.error("Error ending room:", err);
      alert("Failed to end the session.");
    }
  };

  const handleBack = () => {
    if (!sessionEnded) {
      const confirmed = window.confirm("Leave Live Monitoring?\nThe viva session may still be active.");
      if (!confirmed) return;
    }
    navigate("/dashboard");
  };

  const getStatusClass = (status) => {
    if (status === "In Progress") return "status-progress";
    if (status === "Completed") return "status-completed";
    if (status === "Waiting") return "status-waiting";
    return "";
  };

  const getRiskClass = (risk) => {
    if (risk >= 80) return "risk-high";
    if (risk >= 40) return "risk-medium";
    return "risk-low";
  };

  // Stats
  const activeCount = students.filter(s => s.status === "In Progress").length;
  const completedCount = students.filter(s => s.status === "Completed").length;
  const waitingCount = students.filter(s => s.status === "Waiting").length;
  const flaggedCount = students.filter(s => s.risk >= 40).length;

  return (
    <div className="live-monitoring-page">
      <header className="live-topbar">
        <div className="live-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1>
            Live Monitoring — {selectedRoom?.questionBankId?.title || "No Room Selected"}
          </h1>
          <span className="live-badge">LIVE</span>
          
          {rooms.length > 1 && (
            <select 
              style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              value={selectedRoom?._id || ''}
              onChange={(e) => {
                const r = rooms.find(r => r._id === e.target.value);
                if (r) setSelectedRoom(r);
              }}
            >
              {rooms.map(r => (
                <option key={r._id} value={r._id}>Room Code: {r.roomCode} ({r.questionBankId?.title})</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="live-content">
        <section className="live-session-header">
          <div className="live-header-left">
            <button className="live-back-button" onClick={handleBack}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h2>Real-Time Examination Desk</h2>
              <p>Monitor live oral prompts, active response timers, and security vectors.</p>
            </div>
          </div>

          <div className="session-controls">
            <div className="elapsed-timer">
              <Clock3 size={15} />
              <strong>{formattedElapsedTime}</strong>
              <span>Elapsed</span>
            </div>
            <button className="end-session-button" onClick={handleEndSession} disabled={sessionEnded}>
              <Square size={13} fill="currentColor" />
              {sessionEnded ? "Session Ended" : "End Session"}
            </button>
          </div>
        </section>

        {sessionEnded && (
          <div className="session-ended-banner">
            <CheckCircle2 size={18} />
            <div>
              <strong>Viva session ended</strong>
              <span>The examination session has been closed successfully.</span>
            </div>
          </div>
        )}

        <section className="monitoring-grid">
          {students.length === 0 ? (
            <div style={{ padding: '20px', color: '#666' }}>No students found in this room.</div>
          ) : (
            students.map((student) => (
              <article className="student-monitor-card" key={student.id}>
                <div className="student-card-header">
                  <div className="student-information">
                    <div className="student-avatar">{student.avatar}</div>
                    <div>
                      <h3>{student.name}</h3>
                      <span>{student.rollNo}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {student.hasFlaggedReview && (
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Review Flag
                      </span>
                    )}
                    <span className={`student-status ${getStatusClass(student.status)}`}>
                      {student.status}
                    </span>
                  </div>
                </div>

                <div className="student-progress-row">
                  <div>
                    <HelpCircle size={13} />
                    <span>{student.question}</span>
                  </div>
                  <div>
                    <Clock3 size={13} />
                    <span>{student.remaining}</span>
                  </div>
                </div>

                <div className="student-divider" />

                <div className="risk-section">
                  <div className="risk-header">
                    <span>Cheating Threat Vector</span>
                    <strong className={getRiskClass(student.risk)}>
                      {student.risk}%
                    </strong>
                  </div>
                  <div className="risk-bar">
                    <div className={`risk-fill ${getRiskClass(student.risk)}`} style={{ width: `${student.risk}%` }} />
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="class-summary">
          <div className="summary-title">CLASS SUMMARY:</div>
          <div className="summary-stat active-stat">
            <span className="summary-dot" />
            <span>Active:</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="summary-stat completed-stat">
            <span className="summary-dot" />
            <span>Completed:</span>
            <strong>{completedCount}</strong>
          </div>
          <div className="summary-stat waiting-stat">
            <span className="summary-dot" />
            <span>Waiting:</span>
            <strong>{waitingCount}</strong>
          </div>
          <div className="summary-stat flagged-stat">
            <span className="summary-dot" />
            <span>Flagged Risks:</span>
            <strong>{flaggedCount}</strong>
          </div>
          <button className="audit-button">
            <Eye size={14} /> View Audit Stream
          </button>
        </section>
      </main>
    </div>
  );
}
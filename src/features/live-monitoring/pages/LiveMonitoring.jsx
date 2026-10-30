import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../../../services/socket";
import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  HelpCircle,
  Square,
  BookOpen,
  X,
  Maximize2,
  Video,
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
  const [videoFeeds, setVideoFeeds] = useState({});
  const [enlargedStudent, setEnlargedStudent] = useState(null);

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
          // Strictly match sessions belonging to this specific room (by examRoomId)
          const roomSessions = allSessions.filter(s => {
            const sRoomId = s.examRoomId?._id || s.examRoomId;
            return sRoomId ? String(sRoomId) === String(room._id) : false;
          });

          // Deduplicate sessions: keep only the latest session per student rollNo
          const latestSessionsByRoll = new Map();
          for (const s of roomSessions) {
            const roll = s.studentInfo?.rollNo || String(s._id);
            if (!latestSessionsByRoll.has(roll)) {
              latestSessionsByRoll.set(roll, s);
            }
          }

          const activeSessions = Array.from(latestSessionsByRoll.values()).map(s => {
            const risk = s.proctoringLogs?.cheatingProbability || 0;
            return {
              id: s._id,
              name: s.studentInfo?.name || "Unknown",
              rollNo: s.studentInfo?.rollNo || "",
              status: s.status === 'COMPLETED' ? 'Completed' : 'In Progress',
              question: s.status === 'COMPLETED' ? 'Finished' : 'Active',
              remaining: s.status === 'COMPLETED' ? `Score: ${s.totalScore || 0}` : "In Session",
              risk: risk,
              avatar: (s.studentInfo?.name || "ST").substring(0, 2).toUpperCase()
            };
          });

          // Waiting students: allowed students who haven't started yet
          let waitingStudents = [];
          if (room.allowedStudents) {
            waitingStudents = room.allowedStudents
              .filter(ast => !latestSessionsByRoll.has(ast.rollNo))
              .map(ast => ({
                id: `wait-${ast.rollNo}`,
                name: ast.name,
                rollNo: ast.rollNo,
                status: "Waiting",
                question: "Queued",
                remaining: "Not started",
                risk: 0,
                avatar: (ast.name || "ST").substring(0, 2).toUpperCase()
              }));
          }

          return {
            ...room,
            mappedStudents: [...activeSessions, ...waitingStudents]
          };
        });

        setRooms(enrichedRooms);
        if (enrichedRooms.length > 0) {
          const activeRoom = enrichedRooms.find(r => r.isActive) || enrichedRooms[0];
          setSelectedRoom(activeRoom);
          setStudents(activeRoom.mappedStudents);
          setSessionEnded(!activeRoom.isActive);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  /* =======================================================
     SOCKET.IO REAL-TIME UPDATES & ROOM SCOPING
  ======================================================== */
  useEffect(() => {
    const socket = getSocket();

    const handleVideoFrame = (data) => {
      if (!data?.sessionId) return;
      if (selectedRoom && data.roomCode && data.roomCode !== selectedRoom.roomCode) return;

      setVideoFeeds(prev => ({
        ...prev,
        [data.sessionId]: data.frame
      }));
    };

    const handleTeacherUpdate = (data) => {
      setRooms(prevRooms => {
        return prevRooms.map(room => {
          // Only update the room matching this socket event
          const eventRoomId = data.examRoomId ? String(data.examRoomId) : null;
          const matchesRoomId = eventRoomId && String(room._id) === eventRoomId;
          const matchesRoomCode = data.roomCode && String(room.roomCode) === String(data.roomCode);

          if (!matchesRoomId && !matchesRoomCode) {
            return room;
          }

          let newMapped = [...room.mappedStudents];
          
          if (data.type === 'SESSION_STARTED') {
             const waitIdx = newMapped.findIndex(s => s.rollNo === data.studentInfo?.rollNo && s.status === "Waiting");
             if (waitIdx !== -1) {
               newMapped[waitIdx] = {
                 ...newMapped[waitIdx],
                 id: data.sessionId,
                 status: "In Progress",
                 question: "Active",
                 remaining: "Just started"
               };
             } else {
               const existingIdx = newMapped.findIndex(s => s.rollNo === data.studentInfo?.rollNo);
               const newCard = {
                 id: data.sessionId,
                 name: data.studentInfo?.name || "Unknown",
                 rollNo: data.studentInfo?.rollNo || "",
                 status: "In Progress",
                 question: "Active",
                 remaining: "Just started",
                 risk: 0,
                 avatar: (data.studentInfo?.name || "ST").substring(0, 2).toUpperCase()
               };
               if (existingIdx !== -1) {
                 newMapped[existingIdx] = newCard;
               } else {
                 newMapped.unshift(newCard);
               }
             }
          } else if (data.type === 'SESSION_UPDATED') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId || s.rollNo === data.studentInfo?.rollNo);
             if (idx !== -1) {
               const curr = data.sessionData?.currentQuestion;
               if (curr) {
                 newMapped[idx].question = `Q${curr?.index + 1}/${curr?.total}`;
               }
               const scoreDisplay = data.currentScore !== undefined ? ` • Score: ${data.currentScore}` : '';
               newMapped[idx].remaining = `${data.sessionData?.elapsedTime || 0}s${scoreDisplay}`;
               newMapped[idx].hasFlaggedReview = data.hasFlaggedReview || false;
               newMapped[idx].currentScore = data.currentScore || 0;
             }
          } else if (data.type === 'SESSION_COMPLETED') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId || s.rollNo === data.studentInfo?.rollNo);
             if (idx !== -1) {
               newMapped[idx].status = "Completed";
               newMapped[idx].question = "Finished";
               newMapped[idx].remaining = `Score: ${data.totalScore}`;
             }
          } else if (data.type === 'PROCTOR_ALERT') {
             const idx = newMapped.findIndex(s => s.id === data.sessionId || s.rollNo === data.studentInfo?.rollNo);
             if (idx !== -1) {
               newMapped[idx].risk = data.cheatingProbability;
             }
          }
          
          return { ...room, mappedStudents: newMapped };
        });
      });
    };

    socket.on("teacher_live_update", handleTeacherUpdate);
    socket.on("teacher:live_update", handleTeacherUpdate);
    socket.on("teacher:video_frame", handleVideoFrame);

    return () => {
      socket.off("teacher_live_update", handleTeacherUpdate);
      socket.off("teacher:live_update", handleTeacherUpdate);
      socket.off("teacher:video_frame", handleVideoFrame);
    };
  }, [selectedRoom]);

  // Join dedicated examination room channel when room is selected
  useEffect(() => {
    if (!selectedRoom?.roomCode) return;
    const socket = getSocket();
    const roomCode = selectedRoom.roomCode;
    socket.emit("room:join", { roomCode, role: "teacher" });

    return () => {
      if (enlargedStudent?.id) {
        socket.emit("video:unsubscribe", {
          sessionId: enlargedStudent.id,
          roomCode,
        });
      }
      socket.emit("room:leave", { roomCode });
    };
  }, [selectedRoom?.roomCode, enlargedStudent?.id]);

  const handleOpenLiveStream = (student) => {
    if (!student?.id || !selectedRoom?.roomCode) return;
    setEnlargedStudent(student);
    const socket = getSocket();
    socket.emit("video:subscribe", {
      sessionId: student.id,
      roomCode: selectedRoom.roomCode,
    });
  };

  const handleCloseLiveStream = () => {
    if (enlargedStudent?.id && selectedRoom?.roomCode) {
      const socket = getSocket();
      socket.emit("video:unsubscribe", {
        sessionId: enlargedStudent.id,
        roomCode: selectedRoom.roomCode,
      });
    }
    setEnlargedStudent(null);
  };

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

  const [roomFilter, setRoomFilter] = useState("all"); // 'all' | 'active' | 'ended'

  const filteredRooms = useMemo(() => {
    if (roomFilter === "active") return rooms.filter(r => r.isActive);
    if (roomFilter === "ended") return rooms.filter(r => !r.isActive);
    return rooms;
  }, [rooms, roomFilter]);

  return (
    <div className="live-monitoring-page">
      <header className="live-topbar">
        <div className="live-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1>
            Live Monitoring — {selectedRoom?.questionBankId?.title || selectedRoom?.courseDetails?.courseName || "No Room Selected"}
          </h1>
          
          <span 
            className="live-badge" 
            style={{ 
              backgroundColor: selectedRoom?.isActive ? '#e6f8f1' : '#f1f5f9',
              color: selectedRoom?.isActive ? '#0f766e' : '#64748b',
              border: `1px solid ${selectedRoom?.isActive ? '#a7f3d0' : '#cbd5e1'}`
            }}
          >
            {selectedRoom?.isActive ? "LIVE" : "ENDED"}
          </span>

          {/* Room Filter Pills */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '3px' }}>
            <button
              type="button"
              onClick={() => setRoomFilter("all")}
              style={{
                border: 'none',
                padding: '4px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: roomFilter === "all" ? '#fff' : 'transparent',
                color: roomFilter === "all" ? '#0f172a' : '#64748b',
                boxShadow: roomFilter === "all" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All ({rooms.length})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter("active")}
              style={{
                border: 'none',
                padding: '4px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: roomFilter === "active" ? '#fff' : 'transparent',
                color: roomFilter === "active" ? '#0f172a' : '#64748b',
                boxShadow: roomFilter === "active" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Active ({rooms.filter(r => r.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter("ended")}
              style={{
                border: 'none',
                padding: '4px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: roomFilter === "ended" ? '#fff' : 'transparent',
                color: roomFilter === "ended" ? '#0f172a' : '#64748b',
                boxShadow: roomFilter === "ended" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Ended ({rooms.filter(r => !r.isActive).length})
            </button>
          </div>
          
          {filteredRooms.length > 0 && (
            <select 
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
              value={selectedRoom?._id || ''}
              onChange={(e) => {
                const r = rooms.find(r => r._id === e.target.value);
                if (r) {
                  setSelectedRoom(r);
                  setSessionEnded(!r.isActive);
                }
              }}
            >
              {filteredRooms.map(r => (
                <option key={r._id} value={r._id}>
                  {r.isActive ? "🟢 [ACTIVE]" : "⚪ [ENDED]"} Code: {r.roomCode} — {r.questionBankId?.title || r.courseDetails?.courseName || "Viva Session"}
                </option>
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

                <div 
                  className="student-video-container on-demand"
                  onClick={() => handleOpenLiveStream(student)}
                  title="Click to stream live video"
                >
                  <div className="on-demand-placeholder">
                    <div className="camera-icon-wrapper">
                      <Video size={16} />
                    </div>
                    <div className="on-demand-text">
                      <strong>Webcam Feed</strong>
                      <span>{student.status === "In Progress" ? "Standby • Click to Stream" : "Feed Inactive"}</span>
                    </div>
                  </div>
                  <span className="live-rec-badge standby">
                    <span className="rec-dot standby" /> ON DEMAND
                  </span>
                  <button className="watch-stream-btn" type="button">
                    <Eye size={10} /> Watch Live
                  </button>
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

      {/* Enlarged Video Modal */}
      {enlargedStudent && (
        <div className="video-modal-overlay" onClick={handleCloseLiveStream}>
          <div className="video-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>
                <Eye size={15} /> {enlargedStudent.name}
                <span>({enlargedStudent.rollNo})</span>
                <span className="live-rec-badge active" style={{ position: 'static', marginLeft: '8px' }}>
                  <span className="rec-dot" /> STREAMING
                </span>
              </h3>
              <button className="video-modal-close" onClick={handleCloseLiveStream} type="button">
                <X size={14} />
              </button>
            </div>
            <div className="video-modal-feed">
              {videoFeeds[enlargedStudent.id] ? (
                <img src={videoFeeds[enlargedStudent.id]} alt="Live Proctor Feed" />
              ) : (
                <div className="video-modal-loading">
                  <div className="feed-spinner" />
                  <span>Requesting live student stream...</span>
                </div>
              )}
            </div>
            <div className="video-modal-footer">
              <div>
                <strong>Status:</strong> {enlargedStudent.status} • <strong>Progress:</strong> {enlargedStudent.question}
              </div>
              <div>
                <strong>Cheating Threat:</strong>{" "}
                <span style={{ color: enlargedStudent.risk >= 40 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                  {enlargedStudent.risk}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
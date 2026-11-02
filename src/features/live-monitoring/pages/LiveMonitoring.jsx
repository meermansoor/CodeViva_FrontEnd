import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../../../services/socket";
import { getWebRTCConfig } from "../../../services/webrtcConfig";
import { api } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import { SOCKET_EVENTS, LIVE_UPDATE_TYPE } from "../../../constants/socketEvents";

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
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
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
  const [enlargedStudent, setEnlargedStudent] = useState(null);
  const enlargedStudentRef = useRef(null);
  enlargedStudentRef.current = enlargedStudent;

  const [webrtcStatus, setWebrtcStatus] = useState("idle"); // 'idle' | 'connecting' | 'connected' | 'failed'
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  const enlargedVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const studentSocketIdRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  /* =======================================================
     FETCH INITIAL DATA
  ======================================================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, sessionsRes] = await Promise.all([
          api.get(ENDPOINTS.TEACHER_EXAM_ROOMS).catch(() => ({ data: { success: false, data: [] } })),
          api.get(ENDPOINTS.TEACHER_SESSIONS).catch(() => ({ data: { success: false, data: [] } }))
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
          
          if (data.type === LIVE_UPDATE_TYPE.SESSION_STARTED) {
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
          } else if (data.type === LIVE_UPDATE_TYPE.SESSION_UPDATED) {
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
          } else if (data.type === LIVE_UPDATE_TYPE.SESSION_COMPLETED) {
             const idx = newMapped.findIndex(s => s.id === data.sessionId || s.rollNo === data.studentInfo?.rollNo);
             if (idx !== -1) {
               newMapped[idx].status = "Completed";
               newMapped[idx].question = "Finished";
               newMapped[idx].remaining = `Score: ${data.totalScore}`;
             }
          } else if (data.type === LIVE_UPDATE_TYPE.PROCTOR_ALERT) {
             const idx = newMapped.findIndex(s => s.id === data.sessionId || s.rollNo === data.studentInfo?.rollNo);
             if (idx !== -1) {
               newMapped[idx].risk = data.cheatingProbability;
             }
          }
          
          return { ...room, mappedStudents: newMapped };
        });
      });
    };

    socket.on(SOCKET_EVENTS.LEGACY_TEACHER_LIVE_UPDATE, handleTeacherUpdate);
    socket.on(SOCKET_EVENTS.TEACHER_LIVE_UPDATE, handleTeacherUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.LEGACY_TEACHER_LIVE_UPDATE, handleTeacherUpdate);
      socket.off(SOCKET_EVENTS.TEACHER_LIVE_UPDATE, handleTeacherUpdate);
    };
  }, [selectedRoom]);

  // Join dedicated examination room channel when room is selected
  useEffect(() => {
    if (!selectedRoom?.roomCode) return;
    const socket = getSocket();
    const roomCode = selectedRoom.roomCode;
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomCode, role: "teacher" });

    return () => {
      if (studentSocketIdRef.current) {
        socket.emit(SOCKET_EVENTS.WEBRTC_CLOSE, {
          targetSocketId: studentSocketIdRef.current,
        });
      }
      socket.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomCode });
    };
  }, [selectedRoom?.roomCode]);

  /* =======================================================
     WEBRTC P2P SIGNALING LISTENERS (SUPERVISOR LIVE FEED)
  ======================================================== */
  useEffect(() => {
    const socket = getSocket();

    const handleWebRTCOffer = async (data) => {
      const currentStudent = enlargedStudentRef.current;
      if (!currentStudent) return;
      const isSessionMatch = currentStudent.id && String(currentStudent.id) === String(data?.studentSessionId);
      const isRollMatch = currentStudent.rollNo && data?.rollNo && String(currentStudent.rollNo).toLowerCase() === String(data.rollNo).toLowerCase();
      if (!isSessionMatch && !isRollMatch) {
        return;
      }
      const studentSocketId = data.studentSocketId;
      if (!studentSocketId || !data?.offer) return;

      studentSocketIdRef.current = studentSocketId;

      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        pendingCandidatesRef.current = [];

        const pc = new RTCPeerConnection(getWebRTCConfig());
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          console.log("[WebRTC Teacher] Received remote stream track:", event.track.kind);
          if (enlargedVideoRef.current && event.streams && event.streams[0]) {
            enlargedVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc:ice", {
              targetSocketId: studentSocketId,
              candidate: event.candidate,
            });
          }
        };

        const updateStatus = () => {
          const iceState = pc.iceConnectionState;
          const connState = pc.connectionState;
          console.log(`[WebRTC Teacher] ICE: ${iceState}, Conn: ${connState}`);
          if (connState === "connected" || iceState === "connected" || iceState === "completed") {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setWebrtcStatus("connected");
          } else if (connState === "failed" || iceState === "failed") {
            setWebrtcStatus("failed");
          } else if (connState === "disconnected" || iceState === "disconnected") {
            setWebrtcStatus("failed");
          }
        };

        pc.onconnectionstatechange = updateStatus;
        pc.oniceconnectionstatechange = updateStatus;

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Flush queued ICE candidates that arrived before offer was set
        while (pendingCandidatesRef.current.length > 0) {
          const cand = pendingCandidatesRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("[WebRTC Teacher] Queued candidate error:", e);
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(SOCKET_EVENTS.WEBRTC_ANSWER, {
          studentSocketId,
          answer,
        });
      } catch (err) {
        console.error("[WebRTC Teacher] Failed handling WebRTC offer:", err);
        setWebrtcStatus("failed");
      }
    };

    const handleWebRTCIce = async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc || !data?.candidate) return;

      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      } catch (err) {
        console.warn("[WebRTC Teacher] Add ICE candidate error:", err);
      }
    };

    const handleWebRTCClose = () => {
      console.log("[WebRTC Teacher] Student closed or disconnected stream");
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (enlargedVideoRef.current) {
        enlargedVideoRef.current.srcObject = null;
      }
      setWebrtcStatus("failed");
    };

    socket.on(SOCKET_EVENTS.WEBRTC_OFFER, handleWebRTCOffer);
    socket.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, handleWebRTCIce);
    socket.on(SOCKET_EVENTS.WEBRTC_CLOSE, handleWebRTCClose);

    return () => {
      socket.off(SOCKET_EVENTS.WEBRTC_OFFER, handleWebRTCOffer);
      socket.off(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, handleWebRTCIce);
      socket.off(SOCKET_EVENTS.WEBRTC_CLOSE, handleWebRTCClose);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      pendingCandidatesRef.current = [];
    };
  }, []);

  const handleOpenLiveStream = (student) => {
    if (!student?.id || !selectedRoom?.roomCode) return;
    setEnlargedStudent(student);
    setWebrtcStatus("connecting");
    setIsAudioMuted(true);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    studentSocketIdRef.current = null;

    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      setWebrtcStatus((prev) => {
        if (prev === "connecting") {
          console.warn("[WebRTC Teacher] Stream request timed out after 12s - student client unresponsive");
          return "failed";
        }
        return prev;
      });
    }, 12000);

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.WEBRTC_INIT, {
      targetStudentSessionId: student.id,
      targetRollNo: student.rollNo,
      roomCode: selectedRoom.roomCode,
    });
  };

  const handleRetryConnection = () => {
    if (!enlargedStudent?.id || !selectedRoom?.roomCode) return;
    setWebrtcStatus("connecting");

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    studentSocketIdRef.current = null;

    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      setWebrtcStatus((prev) => {
        if (prev === "connecting") {
          console.warn("[WebRTC Teacher] Stream request timed out after 12s - student client unresponsive");
          return "failed";
        }
        return prev;
      });
    }, 12000);

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.WEBRTC_INIT, {
      targetStudentSessionId: enlargedStudent.id,
      targetRollNo: enlargedStudent.rollNo,
      roomCode: selectedRoom.roomCode,
    });
  };

  const handleCloseLiveStream = () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    const socket = getSocket();
    if (studentSocketIdRef.current) {
      socket.emit(SOCKET_EVENTS.WEBRTC_CLOSE, {
        targetSocketId: studentSocketIdRef.current,
      });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (enlargedVideoRef.current) {
      enlargedVideoRef.current.srcObject = null;
    }
    studentSocketIdRef.current = null;
    pendingCandidatesRef.current = [];
    setWebrtcStatus("idle");
    setEnlargedStudent(null);
    setIsAudioMuted(true);
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
      const res = await api.put(ENDPOINTS.END_EXAM_ROOM(selectedRoom._id), {});
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
                {webrtcStatus === "connected" && (
                  <span className="live-rec-badge active" style={{ position: 'static', marginLeft: '8px' }}>
                    <span className="rec-dot" /> LIVE 30 FPS • P2P
                  </span>
                )}
                {webrtcStatus === "connecting" && (
                  <span className="live-rec-badge standby" style={{ position: 'static', marginLeft: '8px', background: '#fef3c7', color: '#b45309', borderColor: '#fcd34d' }}>
                    <span className="rec-dot standby" style={{ background: '#f59e0b' }} /> CONNECTING...
                  </span>
                )}
                {webrtcStatus === "failed" && (
                  <span className="live-rec-badge" style={{ position: 'static', marginLeft: '8px', background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' }}>
                    <span className="rec-dot" style={{ background: '#ef4444' }} /> CONNECTION FAILED
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAudioMuted((prev) => !prev)}
                  title={isAudioMuted ? "Unmute Student Mic" : "Mute Student Mic"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: isAudioMuted ? '#f8fafc' : '#eff6ff',
                    color: isAudioMuted ? '#64748b' : '#2563eb',
                    cursor: 'pointer'
                  }}
                >
                  {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isAudioMuted ? "Muted" : "Live Mic"}
                </button>
                <button className="video-modal-close" onClick={handleCloseLiveStream} type="button">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="video-modal-feed">
              <video
                ref={enlargedVideoRef}
                autoPlay
                playsInline
                muted={isAudioMuted}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scaleX(-1)',
                  display: webrtcStatus === 'connected' ? 'block' : 'none'
                }}
              />

              {webrtcStatus === "connecting" && (
                <div className="video-modal-loading">
                  <div className="feed-spinner" />
                  <span>Connecting hardware-accelerated WebRTC stream (30 FPS)...</span>
                </div>
              )}

              {webrtcStatus === "failed" && (
                <div className="video-modal-loading" style={{ color: '#f87171', padding: '20px', textAlign: 'center' }}>
                  <AlertCircle size={32} />
                  <span style={{ fontWeight: '600', marginTop: '6px' }}>Student Feed Unreachable</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '340px', lineHeight: '1.4', marginTop: '4px' }}>
                    The student is not currently active in the live exam (may be on identity verification/environment check steps), their tab was closed, or direct UDP is restricted.
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryConnection}
                    style={{
                      marginTop: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={12} /> Retry Connection
                  </button>
                </div>
              )}
            </div>
            <div className="video-modal-footer">
              <div>
                <strong>Status:</strong> {enlargedStudent.status} • <strong>Progress:</strong> {enlargedStudent.question}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {webrtcStatus === "connected" && (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    • Sub-150ms P2P
                  </span>
                )}
                <div>
                  <strong>Cheating Threat:</strong>{" "}
                  <span style={{ color: enlargedStudent.risk >= 40 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                    {enlargedStudent.risk}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
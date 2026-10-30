import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Copy,
  Check,
  RotateCw,
  PlayCircle,
  CheckCircle2,
  Calendar,
  Users,
  Radio,
  BarChart3,
  ExternalLink,
  Plus,
  BookOpenCheck,
} from "lucide-react";
import axios from "axios";

export default function AllSessionsModal({ isOpen, onClose, onRefreshDashboard }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'completed'
  const [copiedId, setCopiedId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch all sessions created by this teacher
  const fetchAllSessions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem("teacherToken");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/teacher/exam-rooms", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && res.data.data) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch all sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAllSessions();
    }
  }, [isOpen, fetchAllSessions]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Copy Room Code with visual feedback
  const handleCopyCode = (code, id) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // End an active exam room
  const handleEndSession = async (room) => {
    if (!window.confirm(`Are you sure you want to end session "${room.questionBankId?.title || room.roomCode}"? Students will no longer be able to start this viva.`)) {
      return;
    }

    try {
      setActionLoadingId(room._id);
      const token = localStorage.getItem("teacherToken");
      await axios.put(`http://localhost:5000/api/teacher/exam-rooms/${room._id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update state locally
      setSessions((prev) =>
        prev.map((s) => (s._id === room._id ? { ...s, isActive: false } : s))
      );

      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert("Failed to end exam room: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter and search logic
  const filteredSessions = useMemo(() => {
    return sessions.filter((room) => {
      // Status filter
      if (statusFilter === "active" && !room.isActive) return false;
      if (statusFilter === "completed" && room.isActive) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const title = (room.questionBankId?.title || "").toLowerCase();
      const code = (room.roomCode || "").toLowerCase();
      const courseName = (room.courseDetails?.courseName || "").toLowerCase();
      const courseCode = (room.courseDetails?.courseCode || "").toLowerCase();
      const dept = (room.courseDetails?.department || "").toLowerCase();
      const batch = (room.courseDetails?.batch || "").toLowerCase();

      return (
        title.includes(q) ||
        code.includes(q) ||
        courseName.includes(q) ||
        courseCode.includes(q) ||
        dept.includes(q) ||
        batch.includes(q)
      );
    });
  }, [sessions, statusFilter, searchQuery]);

  const activeCount = useMemo(() => sessions.filter((s) => s.isActive).length, [sessions]);
  const completedCount = useMemo(() => sessions.filter((s) => !s.isActive).length, [sessions]);

  if (!isOpen) return null;

  return (
    <div className="all-sessions-backdrop" onClick={onClose}>
      <div
        className="all-sessions-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-sessions-title"
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="all-sessions-header">
          <div className="all-sessions-title-wrap">
            <div className="all-sessions-icon">
              <BookOpenCheck size={20} />
            </div>
            <div>
              <h2 id="all-sessions-title">All Viva Sessions</h2>
              <p>
                Showing all examination rooms and viva sessions created by your teacher account
              </p>
            </div>
          </div>

          <div className="all-sessions-header-actions">
            <button
              className="all-sessions-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ================= TOOLBAR & FILTERS ================= */}
        <div className="all-sessions-toolbar">
          {/* Dynamic Search Box */}
          <div className="all-sessions-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, room code, course, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="all-sessions-filters">
            <button
              type="button"
              className={`all-sessions-filter-pill ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({sessions.length})
            </button>
            <button
              type="button"
              className={`all-sessions-filter-pill ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`all-sessions-filter-pill ${statusFilter === "completed" ? "active" : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="all-sessions-toolbar-right">
            <button
              type="button"
              className="all-sessions-icon-btn"
              onClick={() => fetchAllSessions(true)}
              disabled={refreshing}
              title="Refresh sessions list"
            >
              <RotateCw size={13} className={refreshing ? "spin-icon" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="all-sessions-icon-btn primary"
              onClick={() => {
                onClose();
                navigate("/sessions");
              }}
              title="Create a new Viva Session"
            >
              <Plus size={14} />
              <span>Create Session</span>
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE SESSIONS TABLE ================= */}
        <div className="all-sessions-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
              <RotateCw size={24} className="spin-icon" style={{ margin: "0 auto 12px", display: "block", color: "#3b5bdb" }} />
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>Loading teacher sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
              {searchQuery ? (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    No sessions match "{searchQuery}"
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: "12px" }}>
                    Try searching with another keyword or room code.
                  </p>
                  <button
                    type="button"
                    className="action-btn-sm"
                    onClick={() => setSearchQuery("")}
                    style={{ margin: "0 auto" }}
                  >
                    Clear Search
                  </button>
                </div>
              ) : statusFilter !== "all" ? (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    No {statusFilter} sessions found
                  </p>
                  <button
                    type="button"
                    className="action-btn-sm"
                    onClick={() => setStatusFilter("all")}
                    style={{ margin: "0 auto" }}
                  >
                    Show All Sessions
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    No sessions created yet
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: "12px" }}>
                    Get started by creating your first viva session for students.
                  </p>
                  <button
                    type="button"
                    className="action-btn-sm primary"
                    onClick={() => {
                      onClose();
                      navigate("/sessions");
                    }}
                    style={{ margin: "0 auto" }}
                  >
                    <Plus size={13} /> Create Session
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="all-sessions-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Exam Room / Session</th>
                  <th style={{ width: "14%" }}>Room Code</th>
                  <th style={{ width: "16%" }}>Created At</th>
                  <th style={{ width: "14%" }}>Students</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "24%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((room) => {
                  const title = room.questionBankId?.title || room.courseDetails?.courseName || `Exam Room #${room.roomCode}`;
                  const courseSubtitle = [
                    room.courseDetails?.courseCode,
                    room.courseDetails?.batch,
                    room.courseDetails?.department
                  ].filter(Boolean).join(" · ");

                  const dateStr = new Date(room.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });
                  const timeStr = new Date(room.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  const allowedCount = room.allowedStudents?.length || 0;
                  const attemptCount = room.stats?.totalAttempts || 0;
                  const isCopied = copiedId === room._id;
                  const isEnding = actionLoadingId === room._id;

                  return (
                    <tr key={room._id}>
                      {/* Title & Course details */}
                      <td>
                        <div className="session-info-cell">
                          <span className="session-info-title" title={title}>
                            {title}
                          </span>
                          {courseSubtitle && (
                            <span className="session-info-sub" title={courseSubtitle}>
                              {courseSubtitle}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Room Code with Copy Button */}
                      <td>
                        <button
                          type="button"
                          className={`room-code-badge ${isCopied ? "copied" : ""}`}
                          onClick={() => handleCopyCode(room.roomCode, room._id)}
                          title="Click to copy room code"
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{room.roomCode}</span>
                          {isCopied && <span style={{ fontSize: "10px" }}>(Copied!)</span>}
                        </button>
                      </td>

                      {/* Created Date & Time */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 500, color: "#1e293b" }}>{dateStr}</span>
                          <span style={{ fontSize: "10.5px", color: "#64748b" }}>{timeStr}</span>
                        </div>
                      </td>

                      {/* Participants */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 600, color: "#1e293b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Users size={12} style={{ color: "#64748b" }} />
                            {allowedCount > 0 ? `${allowedCount} Allowed` : "Open Room"}
                          </span>
                          {attemptCount > 0 && (
                            <span style={{ fontSize: "10.5px", color: "#0f766e" }}>
                              {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {room.isActive ? (
                          <span className="status-indicator-live">
                            <span className="pulse-dot"></span>
                            Active
                          </span>
                        ) : (
                          <span className="status-indicator-ended">
                            <CheckCircle2 size={12} />
                            Ended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="session-actions-cell" style={{ justifyContent: "flex-end" }}>
                          {room.isActive ? (
                            <>
                              <button
                                type="button"
                                className="action-btn-sm primary"
                                onClick={() => {
                                  onClose();
                                  navigate("/live-monitoring");
                                }}
                                title="Monitor live session"
                              >
                                <Radio size={12} />
                                Monitor
                              </button>

                              <button
                                type="button"
                                className="action-btn-sm danger"
                                onClick={() => handleEndSession(room)}
                                disabled={isEnding}
                                title="End exam room now"
                              >
                                {isEnding ? "Ending..." : "End"}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="action-btn-sm"
                              onClick={() => {
                                onClose();
                                navigate("/results");
                              }}
                              title="View session results"
                            >
                              <BarChart3 size={12} />
                              Results
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="all-sessions-footer">
          <span className="all-sessions-footer-info">
            Showing <strong>{filteredSessions.length}</strong> of <strong>{sessions.length}</strong> total sessions
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="action-btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

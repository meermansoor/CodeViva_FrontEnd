import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { ArrowUpRight, Search, X, Copy, Check, Radio, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import AllSessionsModal from "./AllSessionsModal";

export default function RecentSessions() {
  const navigate = useNavigate();
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("recent"); // 'recent' | 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem("teacherToken");
      if (!token) return;

      const roomsRes = await axios.get("http://localhost:5000/api/teacher/exam-rooms", {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: { success: false, data: [] } }));

      if (roomsRes.data.success && roomsRes.data.data) {
        const mapped = roomsRes.data.data.map(room => {
          const allowedCount = room.allowedStudents?.length || 0;
          const attemptCount = room.stats?.totalAttempts || 0;

          let studentLabel = "Open";
          if (allowedCount > 0) {
            studentLabel = `${allowedCount} Students`;
          } else if (attemptCount > 0) {
            studentLabel = `${attemptCount} Submissions`;
          }

          return {
            id: room._id,
            rawRoom: room,
            name: room.questionBankId?.title || room.courseDetails?.courseName || "Viva Session",
            subTitle: [room.courseDetails?.courseCode, room.courseDetails?.batch].filter(Boolean).join(" · "),
            roomCode: room.roomCode,
            course: `Code: ${room.roomCode}`,
            date: new Date(room.createdAt).toLocaleDateString(),
            students: studentLabel,
            status: room.isActive ? "Active" : "Completed",
            isActive: room.isActive
          };
        });

        setAllSessions(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCopyCode = (code, id, e) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(prev => prev === id ? null : prev);
    }, 2000);
  };

  // Filter sessions dynamically based on viewMode and search query
  const displayedSessions = useMemo(() => {
    let list = allSessions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roomCode.toLowerCase().includes(q) ||
        (s.subTitle && s.subTitle.toLowerCase().includes(q))
      );
    }

    if (viewMode === "recent") {
      return list.slice(0, 8);
    }
    return list;
  }, [allSessions, viewMode, searchQuery]);

  return (
    <>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2>{viewMode === "all" ? "All Viva Sessions" : "Recent Viva Sessions"}</h2>
            <span style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "10px",
              background: "#edf2f7",
              color: "#4a5568"
            }}>
              {allSessions.length}
            </span>
          </div>

          <div className="panel-heading-actions">
            {/* View Mode Toggle: Recent vs All */}
            <div className="view-mode-tabs">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "recent" ? "active" : ""}`}
                onClick={() => setViewMode("recent")}
                title="Show 8 most recent sessions"
              >
                Recent
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "all" ? "active" : ""}`}
                onClick={() => setViewMode("all")}
                title="Show all sessions created by you"
              >
                All ({allSessions.length})
              </button>
            </div>

            {/* View All Button that opens the rich interactive modal */}
            <button
              type="button"
              className="outline-button"
              onClick={() => setIsModalOpen(true)}
              title="Open full-screen scrollable modal of all sessions"
            >
              View All <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Dynamic In-Panel Search Bar when viewing all */}
        {viewMode === "all" && (
          <div className="panel-search-bar">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="Filter sessions by title, course, or room code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                onClick={() => setSearchQuery("")}
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Table Wrap */}
        <div className={`table-wrap ${viewMode === "all" || displayedSessions.length > 8 ? "scrollable-body" : ""}`}>
          <table>
            <thead>
              <tr>
                <th>Exam Room</th>
                <th>Room Code</th>
                <th>Date</th>
                <th>Participants</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>Loading sessions...</td>
                </tr>
              ) : displayedSessions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "24px" }}>
                    {searchQuery ? (
                      <div>
                        <span style={{ color: "#666" }}>No sessions match "{searchQuery}"</span>
                        <br />
                        <button
                          type="button"
                          className="outline-button"
                          style={{ marginTop: "8px" }}
                          onClick={() => setSearchQuery("")}
                        >
                          Clear Filter
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#666" }}>No viva sessions created yet.</span>
                    )}
                  </td>
                </tr>
              ) : (
                displayedSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="session-name" title={session.name}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{session.name}</span>
                        {session.subTitle && (
                          <span style={{ fontSize: "9px", color: "#8a99ad", fontWeight: 400 }}>
                            {session.subTitle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(session.roomCode, session.id, e)}
                        style={{
                          background: copiedId === session.id ? "#e6f8f1" : "transparent",
                          border: "none",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontFamily: "monospace",
                          color: copiedId === session.id ? "#10a273" : "#3b5bdb",
                          fontWeight: 600,
                          fontSize: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        title="Click to copy room code"
                      >
                        {session.course}
                        {copiedId === session.id ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </td>
                    <td>{session.date}</td>
                    <td>{session.students}</td>
                    <td>
                      <StatusBadge status={session.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Full All Sessions Modal */}
      <AllSessionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefreshDashboard={fetchSessions}
      />
    </>
  );
}
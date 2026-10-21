import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowUpRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function RecentSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        if (!token) return;

        const roomsRes = await axios.get("http://localhost:5000/api/teacher/exam-rooms", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: false, data: [] } }));

        let combined = [];

        if (roomsRes.data.success && roomsRes.data.data) {
          combined = roomsRes.data.data.map(room => ({
            id: room._id,
            name: room.questionBankId?.title || "Exam Room",
            course: `Code: ${room.roomCode}`,
            date: new Date(room.createdAt).toLocaleDateString(),
            students: "Live",
            status: room.isActive ? "Active" : "Completed"
          }));
        }

        setSessions(combined.slice(0, 8)); // Top 8 recent
      } catch (err) {
        console.error("Failed to fetch recent sessions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, []);

  return (
    <section className="panel recent-panel">
      <div className="panel-heading">
        <h2>Recent Viva Sessions</h2>
        <button className="outline-button">
          View All <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="table-wrap">
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
                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>Loading...</td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No recent sessions found.</td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="session-name" title={session.name}>
                    {session.name}
                  </td>
                  <td>{session.course}</td>
                  <td>{session.date}</td>
                  <td>{session.students}</td>
                  <td><StatusBadge status={session.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
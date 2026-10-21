import { CalendarDays, CheckCircle2, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function UpcomingSchedule() {
  const [examRooms, setExamRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        if (!token) return;

        const res = await axios.get("http://localhost:5000/api/teacher/exam-rooms", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setExamRooms(res.data.data.slice(0, 5)); // show top 5 recent
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRooms();
  }, []);

  return (
    <section className="panel schedule-panel">
      <div className="panel-heading schedule-heading">
        <h2>Recent Exam Rooms</h2>
        <CalendarDays size={15} />
      </div>

      <div className="schedule-list">
        {examRooms.length === 0 ? (
          <div className="schedule-item" style={{ justifyContent: "center" }}>
            <span style={{ color: "#666" }}>No exam rooms created yet.</span>
          </div>
        ) : (
          examRooms.map((room) => {
            const date = new Date(room.createdAt);
            const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = date.getDate();

            return (
              <div className="schedule-item" key={room._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="date-box">
                    <span>{month}</span>
                    <strong>{day}</strong>
                  </div>
                  <div className="schedule-copy">
                    <strong>{room.questionBankId?.title || "Untitled Session"}</strong>
                    <span>Code: {room.roomCode}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: room.isActive ? '#e6f7ff' : '#f5f5f5', color: room.isActive ? '#0070f3' : '#666' }}>
                  {room.isActive ? <PlayCircle size={12} /> : <CheckCircle2 size={12} />}
                  {room.isActive ? "ACTIVE" : "ENDED"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
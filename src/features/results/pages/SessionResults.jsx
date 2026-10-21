import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Award,
  Download,
  FileText,
  Play,
  Pencil,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

import Sidebar from "../../dashboard/components/Sidebar";
import "../styles/session-results.css";

/* =========================================================
   COMPONENT
========================================================= */

export default function SessionResults() {
  const [examRooms, setExamRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [sortOrder, setSortOrder] = useState("high");

  // Fetch Exam Rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        if (!token) return;
        const res = await axios.get("http://localhost:5000/api/teacher/exam-rooms", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          const rooms = res.data.data;
          setExamRooms(rooms);
          if (rooms.length > 0) {
            setSelectedRoomId(rooms[0]._id);
          }
        }
      } catch (err) {
        console.error("Error fetching exam rooms", err);
      }
    };
    fetchRooms();
  }, []);

  // Fetch Dashboard Data for Selected Room
  useEffect(() => {
    if (!selectedRoomId) return;
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("teacherToken");
        const res = await axios.get(`http://localhost:5000/api/teacher/dashboard?examRoomId=${selectedRoomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedRoomId]);

  /* -------------------------------------------------------
     CURRENT SUBJECT
  ------------------------------------------------------- */

  const currentSubject = useMemo(() => {
    if (!examRooms.length || !selectedRoomId) return null;
    const room = examRooms.find(r => r._id === selectedRoomId) || examRooms[0];
    return {
      id: room._id,
      code: room.roomCode,
      name: room.questionBankId?.title || "Untitled Assessment",
      status: room.isActive ? "IN PROGRESS" : "COMPLETED",
    };
  }, [examRooms, selectedRoomId]);

  /* -------------------------------------------------------
     FILTER + SORT STUDENTS
  ------------------------------------------------------- */

  const filteredStudents = useMemo(() => {
    if (!dashboardData || !dashboardData.students_table) return [];
    
    let data = [...dashboardData.students_table];

    if (gradeFilter !== "All Grades") {
      data = data.filter(
        (student) => student.final_grade === gradeFilter
      );
    }

    data.sort((a, b) => {
      const scoreA = a.score_percentage || 0;
      const scoreB = b.score_percentage || 0;

      return sortOrder === "high"
        ? scoreB - scoreA
        : scoreA - scoreB;
    });

    return data;
  }, [dashboardData, gradeFilter, sortOrder]);

  /* -------------------------------------------------------
     GRADE CLASS
  ------------------------------------------------------- */

  const getGradeClass = (grade) => {
    if (!grade) return "grade";
    return `grade grade-${grade.toLowerCase()}`;
  };

  /* -------------------------------------------------------
     CHEATING CLASS
  ------------------------------------------------------- */

  const getCheatingClass = (value) => {
    if (value >= 70) return "cheating-high";
    if (value >= 30) return "cheating-medium";
    return "cheating-low";
  };

  /* -------------------------------------------------------
     EXPORT
  ------------------------------------------------------- */

  const handleExport = async () => {
    if (!currentSubject) return;
    try {
      const token = localStorage.getItem("teacherToken");
      const res = await axios.get(`http://localhost:5000/api/teacher/export/excel?examRoomId=${currentSubject.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `results_${currentSubject.code}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export results.");
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  if (!currentSubject) {
    return (
      <div className="app-shell session-results-shell">
        <Sidebar />
        <div className="main-area" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
          <h2>Loading... or No Exam Rooms Found</h2>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.summary_metrics || {};

  return (
    <div className="app-shell session-results-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div className="results-title">
            <h1>Session Results — {currentSubject.code} {currentSubject.name}</h1>
            <span className="completed-badge">{currentSubject.status}</span>
          </div>
        </header>

        <main className="results-content">
          <div className="subject-filter-bar">
            <div className="subject-filter-left">
              <span className="subject-filter-label">Subject</span>
              <div className="subject-select-wrapper">
                <select
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setGradeFilter("All Grades");
                    setSortOrder("high");
                  }}
                >
                  {examRooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.roomCode} — {room.questionBankId?.title || "Untitled Assessment"}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
            <div className="subject-info">
              Showing results for: <strong>{currentSubject.name}</strong>
            </div>
          </div>

          <section className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon purple"><Award size={19} /></div>
              <div className="summary-copy">
                <span>Overall Average Score</span>
                <strong>{metrics.overall_average_score || 0}%</strong>
                <small>Syllabus standard met</small>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon teal"><TrendingUp size={19} /></div>
              <div className="summary-copy">
                <span>Student Pass Rate</span>
                <strong>{metrics.pass_rate_percentage || 0}%</strong>
                <small>{metrics.passed_count || 0} passing of {metrics.total_students || 0}</small>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon red"><ShieldAlert size={19} /></div>
              <div className="summary-copy">
                <span>Flagged Integrity Cases</span>
                <strong>{metrics.flagged_integrity_cases || 0}</strong>
                <small>High cheating threat risk</small>
              </div>
            </div>
          </section>

          <section className="score-sheet">
            <div className="score-sheet-header">
              <div className="score-sheet-title">
                <h2>Detailed Score Sheet</h2>
                <div className="filter-controls">
                  <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                    <option>All Grades</option>
                    <option value="A+">Grade A+</option>
                    <option value="A">Grade A</option>
                    <option value="B+">Grade B+</option>
                    <option value="B">Grade B</option>
                    <option value="C+">Grade C+</option>
                    <option value="C">Grade C</option>
                    <option value="C-">Grade C-</option>
                    <option value="F">Grade F</option>
                  </select>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="high">Score High-to-Low</option>
                    <option value="low">Score Low-to-High</option>
                  </select>
                </div>
              </div>
              <button className="export-button" onClick={handleExport}>
                <Download size={14} />
                Export Excel
              </button>
            </div>

            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Score (%)</th>
                    <th>Cheating Prob.</th>
                    <th>Final Grade</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.roll_no || idx}>
                        <td className="roll-cell">{student.roll_no}</td>
                        <td>
                          <div className="student-name-cell">
                            <div className="student-avatar">
                              {student.student_name ? student.student_name.substring(0, 2).toUpperCase() : "NA"}
                            </div>
                            <span>{student.student_name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="score-cell">
                            <span>{student.score_percentage}%</span>
                            <div className="score-track">
                              <div className="conceptual-bar" style={{ width: `${student.score_percentage}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`cheating-value ${getCheatingClass(student.cheating_prob)}`}>
                            {student.cheating_prob}%
                          </span>
                        </td>
                        <td>
                          <span className={getGradeClass(student.final_grade)}>{student.final_grade}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button title="View Result" onClick={() => alert(`Viewing result for ${student.student_name}`)}>
                              <FileText size={13} />
                            </button>
                            <button title="Play Viva Recording" onClick={() => alert(`Playing viva recording for ${student.student_name}`)}>
                              <Play size={13} />
                            </button>
                            <button title="Edit Result" onClick={() => alert(`Editing result for ${student.student_name}`)}>
                              <Pencil size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="no-results">
                        {loading ? "Loading results..." : "No students found for the selected grade."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


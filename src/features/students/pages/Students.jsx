import { api } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/students.css";

export default function Students() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const [roomsRes, sessionsRes] = await Promise.all([
          api.get(ENDPOINTS.TEACHER_EXAM_ROOMS).catch(() => ({ data: { success: false, data: [] } })),
          api.get(ENDPOINTS.TEACHER_SESSIONS).catch(() => ({ data: { success: false, data: [] } }))
        ]);
        
        const subjectMap = {};

        if (roomsRes.data.success && roomsRes.data.data) {
          roomsRes.data.data.forEach((room) => {
            const qb = room.questionBankId;
            if (!qb) return;
            subjectMap[qb._id] = {
              id: qb._id,
              code: `Room Code: ${room.roomCode}`,
              name: qb.title || "Untitled Session",
              students: []
            };

            if (room.allowedStudents && room.allowedStudents.length > 0) {
              room.allowedStudents.forEach((student, idx) => {
                subjectMap[qb._id].students.push({
                  id: `allowed-${idx}`,
                  rollNo: student.rollNo,
                  name: student.name,
                  email: student.email || "-",
                  status: "Ready"
                });
              });
            }
          });
        }

        if (sessionsRes.data.success && sessionsRes.data.data) {
          sessionsRes.data.data.forEach((session) => {
            const qb = session.questionBankId;
            if (!qb) return;
            const qbId = qb._id;
            
            if (!subjectMap[qbId]) {
              subjectMap[qbId] = {
                id: qbId,
                code: qb.subject || "N/A",
                name: qb.title || "Untitled Session",
                students: []
              };
            }
            
            const rollNo = session.studentInfo?.rollNo;
            const existingStudent = subjectMap[qbId].students.find(s => s.rollNo === rollNo);

            if (existingStudent) {
              existingStudent.status = session.status === "COMPLETED" ? "Completed" : "In Progress";
              existingStudent.id = session._id;
            } else {
              subjectMap[qbId].students.push({
                id: session._id,
                rollNo: rollNo || "Unknown",
                name: session.studentInfo?.name || "Student",
                email: "-",
                status: session.status === "COMPLETED" ? "Completed" : "In Progress"
              });
            }
          });
        }

        const groupedSubjects = Object.values(subjectMap);
        setSubjects(groupedSubjects);
        
        if (groupedSubjects.length > 0) {
          setSelectedSubject(groupedSubjects[0]);
          setStudents(groupedSubjects[0].students);
        }
      } catch (err) {
        console.error("Failed to fetch students", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    setStudents(subject.students);
    setSearch("");
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStudent = () => {
    const newStudent = {
      id: Date.now(),
      rollNo: `${selectedSubject.code}-${String(
        students.length + 1
      ).padStart(3, "0")}`,
      name: "New Student",
      email: "student@example.com",
      status: "Ready",
    };

    setStudents((prev) => [...prev, newStudent]);
  };

  return (
    <div className="students-page">

      {/* Back Button */}
      <button
        className="students-back-button"
        onClick={() => navigate("/sessions")}
      >
        <ArrowLeft size={12} />
        Back to Sessions
      </button>

      {/* Header */}
      <div className="students-header">
        <div>
          <h1>Students</h1>

          <p>
            Manage students for each Viva subject.
          </p>
        </div>

        <div className="students-header-actions">
          <button
            className="add-btn"
            onClick={handleAddStudent}
          >
            <Plus size={15} />
            Add Student
          </button>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="subject-selection">

        <div className="subject-selection-header">
          <div>
            <h2>Select Subject</h2>
            <p>
              Choose the Viva subject whose students you want to manage.
            </p>
          </div>
        </div>

        <div className="subject-grid">

          {subjects.map((subject) => (
            <button
              key={subject.id}
              className={`subject-card ${
                selectedSubject?.id === subject.id
                  ? "selected"
                  : ""
              }`}
              onClick={() => handleSubjectChange(subject)}
            >
              <div className="subject-icon">
                <BookOpen size={18} />
              </div>

              <div className="subject-card-info">
                <strong>{subject.name}</strong>
                <span>{subject.code}</span>
              </div>

              <div className="subject-student-count">
                {subject.students.length}
                <span>Students</span>
              </div>
            </button>
          ))}

        </div>
      </div>

      {/* Selected Subject */}
      {selectedSubject && (
        <div className="selected-subject-bar">
          <div>
            <span>Current Viva Session</span>
            <strong>
              {selectedSubject.name}
            </strong>
          </div>
          <div className="selected-course-code">
            {selectedSubject.code}
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="students-card">

        <div className="students-toolbar">
          <div className="student-count">
            <strong>{students.length}</strong>
            <span>
              Students in {selectedSubject ? selectedSubject.name : "Session"}
            </span>
          </div>

          <div className="student-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="students-table-wrapper">

          <table className="students-table">

            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>

                    <td>
                      <strong>
                        {student.rollNo}
                      </strong>
                    </td>

                    <td>{student.name}</td>

                    <td>{student.email}</td>

                    <td>
                      <span
                        className={`student-status ${student.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {student.status}
                      </span>
                    </td>

                    <td>
                      <button className="more-btn">
                        <MoreHorizontal size={17} />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="empty-students"
                  >
                    No students found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import {
  Award,
  Download,
  FileText,
  Play,
  Pencil,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
  HelpCircle,
} from "lucide-react";

import Sidebar from "../../dashboard/components/Sidebar";
import "../styles/session-results.css";

/* =========================================================
   COMPONENT
========================================================= */

export default function SessionResults() {
  const location = useLocation();
  const [examRooms, setExamRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [sortOrder, setSortOrder] = useState("high");

  // Modal and evaluation review states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingScores, setEditingScores] = useState({});
  const [editingNotes, setEditingNotes] = useState({});
  const [savingIndex, setSavingIndex] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Fetch Exam Rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get(ENDPOINTS.TEACHER_EXAM_ROOMS);
        if (res.data.success && res.data.data) {
          const rooms = res.data.data;
          setExamRooms(rooms);
          if (rooms.length > 0) {
            const queryRoomId = new URLSearchParams(location.search).get("roomId") || location.state?.roomId;
            const matchingRoom = rooms.find(r => r._id === queryRoomId);
            setSelectedRoomId(matchingRoom ? matchingRoom._id : rooms[0]._id);
          }
        }
      } catch (err) {
        console.error("Error fetching exam rooms", err);
      }
    };
    fetchRooms();
  }, [location.search, location.state]);

  // Fetch Dashboard Data for Selected Room
  const fetchDashboard = useCallback(async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.TEACHER_DASHBOARD, {
        params: { examRoomId: selectedRoomId },
      });
      if (res.data.success && res.data.data) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    setDashboardData(null);
    fetchDashboard();
  }, [selectedRoomId, fetchDashboard]);

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
      const res = await api.get(ENDPOINTS.TEACHER_EXPORT_EXCEL, {
        params: { examRoomId: currentSubject.id },
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

  /* -------------------------------------------------------
     MODAL & SCORE OVERRIDE HANDLERS
  ------------------------------------------------------- */

  const handleOpenDetails = async (student) => {
    setSelectedStudent(student);
    setEditingScores({});
    setEditingNotes({});
    if (student.session_id) {
      setLoadingDetails(true);
      try {
        const res = await api.get(ENDPOINTS.TEACHER_SESSION(student.session_id));
        if (res.data.success && res.data.data) {
          setSessionDetails(res.data.data);
          const initialScores = {};
          const initialNotes = {};
          const answers = res.data.data.answersMap || {};
          Object.entries(answers).forEach(([k, ans]) => {
            initialScores[k] = ans.score ?? 0;
            initialNotes[k] = ans.teacher_notes || '';
          });
          setEditingScores(initialScores);
          setEditingNotes(initialNotes);
        }
      } catch (err) {
        console.error("Failed to load session details", err);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      const initialScores = {};
      const initialNotes = {};
      const answers = student.detailed_answers || {};
      Object.entries(answers).forEach(([k, ans]) => {
        initialScores[k] = ans.score ?? 0;
        initialNotes[k] = ans.teacher_notes || '';
      });
      setEditingScores(initialScores);
      setEditingNotes(initialNotes);
    }
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setSessionDetails(null);
    setEditingScores({});
    setEditingNotes({});
    setSaveSuccess(null);
  };

  const handleSaveScore = async (qIndex) => {
    if (!selectedStudent?.session_id) {
      alert("Session ID not available for score adjustment.");
      return;
    }
    const scoreVal = editingScores[qIndex];
    if (scoreVal === undefined || isNaN(scoreVal)) return;

    setSavingIndex(qIndex);
    try {
      const res = await api.put(
        ENDPOINTS.TEACHER_SESSION_ANSWER(selectedStudent.session_id, qIndex),
        { score: parseFloat(scoreVal), teacherNotes: editingNotes[qIndex] || '' }
      );
      if (res.data.success) {
        setSaveSuccess(`Score for Q${qIndex + 1} updated to ${res.data.data.score}!`);
        setTimeout(() => setSaveSuccess(null), 3000);

        setSessionDetails(prev => {
          if (!prev) return prev;
          const updatedAnswers = { ...prev.answersMap, ...res.data.data.answersMap };
          return {
            ...prev,
            answersMap: updatedAnswers,
            totalScore: res.data.data.totalScore,
            scorePercentage: res.data.data.scorePercentage,
            finalGrade: res.data.data.finalGrade,
            gradePoint: res.data.data.gradePoint
          };
        });

        setDashboardData(prev => {
          if (!prev || !prev.students_table) return prev;
          const updatedTable = prev.students_table.map(s => {
            if (s.session_id === selectedStudent.session_id) {
              const maxPart = res.data.data.totalMarks || (s.marks_obtained || '').split(' / ')[1] || '15';
              return {
                ...s,
                marks_obtained: `${res.data.data.totalScore} / ${maxPart}`,
                score_percentage: res.data.data.scorePercentage,
                final_grade: res.data.data.finalGrade,
                grade_point: res.data.data.gradePoint,
                detailed_answers: res.data.data.answersMap
              };
            }
            return s;
          });
          return { ...prev, students_table: updatedTable };
        });

        // Refresh room metrics summary from server
        fetchDashboard();
      }
    } catch (err) {
      alert("Failed to update score: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingIndex(null);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  if (!currentSubject) {
    return (
      <div className="app-shell session-results-shell">
        <Sidebar />
        <div className="main-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <th>Marks Obtained</th>
                    <th>Score (%)</th>
                    <th>Cheating Prob.</th>
                    <th>Final Grade</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.session_id || `${student.roll_no}-${idx}`}>
                        <td className="roll-cell">{student.roll_no}</td>
                        <td>
                          <div className="student-name-cell">
                            <div className="student-avatar">
                              {student.student_name ? student.student_name.substring(0, 2).toUpperCase() : "NA"}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>{student.student_name}</span>
                              {student.requires_teacher_review && (
                                <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', width: 'fit-content' }}>
                                  ⚠️ Needs Review
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="marks-cell">
                            <span className="marks-badge">
                              <strong>
                                {student.marks_obtained && String(student.marks_obtained).includes(' / ')
                                  ? student.marks_obtained.split(' / ')[0]
                                  : (student.marks_obtained ?? student.totalScore ?? '0')}
                              </strong>
                              <span style={{ color: '#64748b', fontWeight: 500 }}>
                                / {student.marks_obtained && String(student.marks_obtained).includes(' / ')
                                  ? student.marks_obtained.split(' / ')[1]
                                  : '15'}
                              </span>
                            </span>
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
                            <button title="View Detailed Evaluation" onClick={() => handleOpenDetails(student)}>
                              <FileText size={13} />
                            </button>
                            <button title="Review & Override Score" onClick={() => handleOpenDetails(student)}>
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

      {selectedStudent && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="eval-modal" onClick={e => e.stopPropagation()}>
            <div className="eval-modal-header">
              <div>
                <h2>{selectedStudent.student_name} ({selectedStudent.roll_no})</h2>
                <div className="eval-modal-subtitle">
                  <span>Marks: <b>{sessionDetails?.totalScore ?? (selectedStudent.marks_obtained?.split(' / ')[0] || 0)} / {(selectedStudent.marks_obtained?.split(' / ')[1]) || '15'}</b></span>
                  <span>Final Grade: <b>{sessionDetails?.finalGrade || selectedStudent.final_grade}</b></span>
                  <span>Score: <b>{sessionDetails?.scorePercentage ?? selectedStudent.score_percentage}%</b></span>
                  <span>Cheating Probability: <b>{selectedStudent.cheating_prob}%</b></span>
                </div>
              </div>
              <button className="eval-modal-close" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <div className="eval-modal-body">
              {saveSuccess && (
                <div className="score-save-toast">
                  <Check size={16} /> {saveSuccess}
                </div>
              )}

              {(sessionDetails?.hasFlaggedReview || selectedStudent.requires_teacher_review) && (
                <div className="eval-review-alert">
                  <AlertTriangle size={18} />
                  <span>
                    <strong>Teacher Review Recommended:</strong> One or more answers in this session had ambiguous evidence or low confidence and require examiner verification.
                  </span>
                </div>
              )}

              {loadingDetails ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  Loading detailed rubric evidence...
                </div>
              ) : (
                (() => {
                  const answers = sessionDetails?.answersMap || selectedStudent.detailed_answers || {};
                  const questions = sessionDetails?.questionBank?.questions || [];
                  const entries = Object.entries(answers);

                  if (entries.length === 0) {
                    return <div style={{ color: '#64748b', padding: '20px' }}>No question responses recorded for this student.</div>;
                  }

                  return entries.map(([idxStr, ans]) => {
                    const qIdx = parseInt(idxStr, 10);
                    const qData = questions[qIdx] || {};
                    const qText = qData.question || `Question ${qIdx + 1}`;
                    const qTopic = qData.topic || 'General Topic';
                    const maxMarks = ans.max_marks || qData.marks || 1.0;
                    const evalDetails = ans.evaluation_details || {};
                    const matched = ans.matched_concepts || evalDetails.matched_concepts || [];
                    const missed = ans.missed_concepts || evalDetails.missed_concepts || [];
                    const partiallyMatched = evalDetails.partially_matched_concepts || [];
                    const isSkipped = ans.status === 'SKIPPED';

                    return (
                      <div className="eval-question-card" key={idxStr}>
                        <div className="eval-q-header">
                          <div className="eval-q-title">
                            <span style={{ color: '#5045e8' }}>Q{qIdx + 1}:</span>
                            <span>{qText}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                              {qTopic}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                              {ans.score} / {maxMarks} marks
                            </span>
                          </div>
                        </div>

                        {ans.transcript ? (
                          <div className="eval-transcript-box">
                            <strong>Student's Verbal Answer</strong>
                            "{ans.transcript}"
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: '6px 0' }}>
                            {isSkipped ? 'Question skipped by student.' : 'No audio transcript detected.'}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: ans.teacher_review_required ? '#fef3c7' : '#e0f2fe',
                            color: ans.teacher_review_required ? '#b45309' : '#0369a1'
                          }}>
                            Route: {ans.teacher_review_required ? '⚠️ Needs Review' : (ans.grading_route || 'Auto-Graded')}
                          </span>

                          {ans.confidence !== undefined && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: ans.confidence >= 0.8 ? '#dcfce7' : ans.confidence >= 0.45 ? '#fef9c3' : '#fee2e2',
                              color: ans.confidence >= 0.8 ? '#15803d' : ans.confidence >= 0.45 ? '#a16207' : '#b91c1c'
                            }}>
                              Confidence: {Math.round(ans.confidence * 100)}%
                            </span>
                          )}

                          {ans.is_reviewed && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857' }}>
                              ✓ Teacher Overridden
                            </span>
                          )}
                        </div>

                        {ans.review_reason && (
                          <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '4px', margin: '6px 0' }}>
                            <strong>Review Reason:</strong> {ans.review_reason}
                          </div>
                        )}

                        {(matched.length > 0 || partiallyMatched.length > 0 || missed.length > 0) && (
                          <div className="eval-concepts-row">
                            {matched.map((c, i) => (
                              <span className="concept-pill concept-matched" key={`m-${i}`}>
                                <CheckCircle2 size={11} /> {c}
                              </span>
                            ))}
                            {partiallyMatched.map((c, i) => (
                              <span className="concept-pill concept-partial" key={`p-${i}`}>
                                <AlertTriangle size={11} /> {c} (partial)
                              </span>
                            ))}
                            {missed.map((c, i) => (
                              <span className="concept-pill concept-missed" key={`x-${i}`}>
                                <X size={11} /> {c}
                              </span>
                            ))}
                          </div>
                        )}

                        {ans.feedback && (
                          <div className="eval-feedback-box">
                            <strong>AI Feedback: </strong> {ans.feedback}
                          </div>
                        )}

                        <div className="eval-score-editor">
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            Override Score:
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={maxMarks}
                            className="score-input"
                            value={editingScores[qIdx] ?? ans.score ?? 0}
                            onChange={(e) => setEditingScores({ ...editingScores, [qIdx]: e.target.value })}
                          />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>/ {maxMarks}</span>

                          <input
                            type="text"
                            placeholder="Teacher note (optional)"
                            className="notes-input"
                            value={editingNotes[qIdx] ?? ans.teacher_notes ?? ''}
                            onChange={(e) => setEditingNotes({ ...editingNotes, [qIdx]: e.target.value })}
                          />

                          <button
                            className="save-score-btn"
                            disabled={savingIndex === qIdx}
                            onClick={() => handleSaveScore(qIdx)}
                          >
                            <Save size={13} />
                            {savingIndex === qIdx ? 'Saving...' : 'Update Score'}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


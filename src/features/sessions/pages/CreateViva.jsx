import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { api, LONG_REQUEST_TIMEOUT_MS } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import { fileUrl } from "../../../config/env";
import * as XLSX from "xlsx";

import Sidebar from "../../dashboard/components/Sidebar";
import "../styles/create-viva.css";

const steps = [
  "Course Details",
  "Syllabus",
  "Questions",
  "Students",
  "Settings",
  "Review",
];

const initialQuestions = [];

const initialStudents = [];

export default function CreateViva() {
  const syllabusInputRef = useRef(null);
  const studentInputRef = useRef(null);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    courseName: "",
    courseCode: "",
    semester: "Spring 2026 (Default)",
    section: "",
  });

  const [syllabusFile, setSyllabusFile] = useState(null);
  const [isDraggingSyllabus, setIsDraggingSyllabus] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questionCount, setQuestionCount] = useState("5");
  const [questionDifficulty, setQuestionDifficulty] = useState("Moderate");
  const [questionsGenerated, setQuestionsGenerated] = useState(false);
  const [questionBankId, setQuestionBankId] = useState(null);

  const [questions, setQuestions] = useState(initialQuestions);
  const [syllabusId, setSyllabusId] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState("All Difficulties");
  const [topicFilter, setTopicFilter] = useState("All Topics");

  useEffect(() => {
    let interval;
    const isMissingData = questions.some(q => 
      !q.audio_file || 
      ((!q.keywords || q.keywords.length === 0) && 
       (!q.expected_keywords || q.expected_keywords.length === 0) && 
       (!q.answer_keywords || q.answer_keywords.length === 0))
    );

    if (syllabusId && questions.length > 0 && isMissingData) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(ENDPOINTS.QUESTIONS_SYLLABUS(syllabusId));
          if (res.data && res.data.data && res.data.data.questions) {
            setQuestions(prev => prev.map(q => {
              const matched = res.data.data.questions.find(apiQ => apiQ.id === q.id);
              if (matched) {
                const kws = (matched.answer_keywords && matched.answer_keywords.length > 0)
                  ? matched.answer_keywords
                  : (matched.expected_keywords && matched.expected_keywords.length > 0)
                  ? matched.expected_keywords
                  : (q.keywords || []);
                return { 
                  ...q, 
                  audio_file: matched.audio_file || q.audio_file,
                  model_answer: matched.model_answer || q.model_answer,
                  keywords: kws,
                  concepts: matched.concepts || q.concepts || [],
                  topic: matched.topic || q.topic,
                  difficulty: matched.difficulty || q.difficulty
                };
              }
              return q;
            }));
          }
        } catch (err) {
          console.error("Failed to poll questions for audio and keywords", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [syllabusId, questions]);

  const [students, setStudents] = useState(initialStudents);
  const [studentFile, setStudentFile] = useState(null);
  const [isDraggingStudents, setIsDraggingStudents] = useState(false);

  const [settings, setSettings] = useState({
    duration: "30",
    questionsPerStudent: "5",
    totalMarks: "15",
    difficulty: "Moderate",
    randomizeQuestions: true,
    enableProctoring: true,
    audioAnalysis: true,
    allowReviva: true,
    integrityFlagging: true,
  });

  // Removed persistence useEffect

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNumber: "",
    name: "",
    email: "",
  });

  /* --------------------------------
     Course Details
  -------------------------------- */

  const updateForm = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* --------------------------------
     Step Navigation
  -------------------------------- */

  const nextStep = () => {
    setStep((current) => Math.min(current + 1, 6));
  };

  const previousStep = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  /* --------------------------------
     Syllabus Upload
  -------------------------------- */

  const validateSyllabus = (file) => {
    if (!file) return false;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const extension = file.name.split(".").pop().toLowerCase();

    return (
      allowedTypes.includes(file.type) ||
      ["pdf", "docx", "txt"].includes(extension)
    );
  };

  const processSyllabus = async (file) => {
    if (!validateSyllabus(file)) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB.");
      return;
    }

    setSyllabusFile(file);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
    }, 1800);
  };

  const handleSyllabusChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      processSyllabus(file);
    }
  };

  const handleSyllabusDrop = (e) => {
    e.preventDefault();

    setIsDraggingSyllabus(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      processSyllabus(file);
    }
  };

  const generateQuestions = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsProcessing(true);
    const formData = new FormData();
    if (syllabusFile) {
      formData.append("file", syllabusFile);
    } else {
      alert("No syllabus file found. Please go back and upload a syllabus.");
      setIsProcessing(false);
      return;
    }
    formData.append("title", form.courseName || "Untitled Course");
    formData.append("subject", form.courseName || "Untitled Subject");
    formData.append("courseCode", form.courseCode || "N/A");
    formData.append("numQuestions", questionCount);

    try {
      const res = await api.post(ENDPOINTS.QUESTIONS_GENERATE, formData, {
        timeout: LONG_REQUEST_TIMEOUT_MS,
      });
      if (res.data.success) {
        const bank = res.data.data;
        setQuestionBankId(bank._id);
        if (bank.syllabusId) setSyllabusId(bank.syllabusId);
        
        const mappedQuestions = bank.questions.map(q => ({
          ...q,
          id: q.id,
          text: q.question,
          difficulty: q.difficulty || "medium",
          topic: q.topic || "General",
          audio_file: q.audio_file || null
        }));
        
        setQuestions(mappedQuestions);
        setQuestionsGenerated(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate questions. Please ensure the RAG server is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  /* --------------------------------
     Questions
  -------------------------------- */

  const regenerateQuestion = (id) => {
    const replacements = {
      1: "Compare TCP and UDP protocols and explain how their reliability, flow control, and header structures affect network communication.",
      2: "Explain how routing algorithms operate at the network layer and compare Distance-Vector routing with Link-State routing.",
      3: "Describe the TCP Three-Way Handshake and explain the purpose of SYN, SYN-ACK, and ACK packets.",
    };

    setQuestions((previous) =>
      previous.map((question) =>
        question.id === id
          ? {
              ...question,
              text:
                replacements[id] ||
                "Explain an important concept from the uploaded course syllabus.",
            }
          : question
      )
    );
  };

  const deleteQuestion = (id) => {
    setQuestions((previous) =>
      previous.filter((question) => question.id !== id)
    );
  };

  const addCustomQuestion = () => {
    if (!customQuestion.trim()) return;

    const newQuestion = {
      id: Date.now(),
      text: customQuestion.trim(),
      difficulty:
        questionDifficulty === "Moderate" ? "Medium" : questionDifficulty,
      topic: "Custom",
    };

    setQuestions((previous) => [...previous, newQuestion]);

    setCustomQuestion("");
    setShowAddQuestion(false);
  };

  const filteredQuestions = questions.filter((question) => {
    const difficultyMatch =
      difficultyFilter === "All Difficulties" ||
      question.difficulty === difficultyFilter;

    const topicMatch =
      topicFilter === "All Topics" || question.topic === topicFilter;

    return difficultyMatch && topicMatch;
  });

  const regenerateAllQuestions = () => {
    setQuestions((previous) =>
      previous.map((question) => ({
        ...question,
        text: `${question.text.replace(/[.]$/, "")} Provide practical examples where appropriate.`,
      }))
    );
  };

  /* --------------------------------
     Student Upload
  -------------------------------- */

  const validateStudentFile = (file) => {
    if (!file) return false;

    const extension = file.name.split(".").pop().toLowerCase();

    return ["csv", "xlsx", "xls"].includes(extension);
  };

  const processStudentFile = (file) => {
    if (!validateStudentFile(file)) {
      alert("Please upload a CSV, XLSX, or XLS file.");
      return;
    }

    setStudentFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length < 2) {
          alert("File appears to be empty or missing data rows.");
          return;
        }
        
        const headers = json[0].map(h => String(h || "").toLowerCase().trim());
        const rollIdx = headers.findIndex(h => h.includes("roll"));
        const nameIdx = headers.findIndex(h => h.includes("name"));
        const emailIdx = headers.findIndex(h => h.includes("email"));

        const parsedStudents = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0 || (!row[0] && !row[1])) continue;
          
          const roll = rollIdx >= 0 ? row[rollIdx] : row[0];
          const name = nameIdx >= 0 ? row[nameIdx] : row[1];
          const email = emailIdx >= 0 ? row[emailIdx] : row[2];
          
          if (roll && name) {
            parsedStudents.push({
              rollNumber: String(roll),
              name: String(name),
              email: email ? String(email) : ""
            });
          }
        }
        setStudents(parsedStudents);
      } catch (err) {
        alert("Failed to parse the file. Please ensure it's a valid CSV/XLSX file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStudentChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      processStudentFile(file);
    }
  };

  const handleStudentDrop = (e) => {
    e.preventDefault();

    setIsDraggingStudents(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      processStudentFile(file);
    }
  };

  const addStudent = () => {
    if (
      !newStudent.rollNumber.trim() ||
      !newStudent.name.trim() ||
      !newStudent.email.trim()
    ) {
      alert("Please fill all student fields.");
      return;
    }

    setStudents((previous) => [...previous, newStudent]);

    setNewStudent({
      rollNumber: "",
      name: "",
      email: "",
    });

    setShowAddStudent(false);
  };

  const removeStudent = (rollNumber) => {
    setStudents((previous) =>
      previous.filter((student) => student.rollNumber !== rollNumber)
    );
  };

  /* --------------------------------
     Settings
  -------------------------------- */

  const updateSettings = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  /* --------------------------------
     Final Create
  -------------------------------- */

  const createVivaSession = async () => {
    if (!questionBankId) {
      alert("No question bank found. Please generate questions from the syllabus first.");
      return;
    }

    try {
      const durationMin = parseInt(settings.duration, 10) || 30;
      const questionsCount = parseInt(settings.questionsPerStudent, 10) || 5;
      const totalMarks = parseFloat(settings.totalMarks) || 15.0;

      // Synchronize fully-completed questions with DB before creating the room
      await api.put(ENDPOINTS.QUESTION_BANK(questionBankId), {
        questions: questions.map(q => {
          const kws = (q.answer_keywords && q.answer_keywords.length > 0)
            ? q.answer_keywords
            : (q.expected_keywords && q.expected_keywords.length > 0)
            ? q.expected_keywords
            : (q.keywords || []);
          return {
            id: q.id,
            question: q.text || q.question,
            keywords: kws,
            concepts: q.concepts || [],
            audio_file: q.audio_file || null,
            topic: q.topic || "General",
            difficulty: q.difficulty || "medium",
            model_answer: q.model_answer || "",
            marks: q.marks || Math.round((totalMarks / questionsCount) * 100) / 100
          };
        }),
        timeLimitSec: durationMin * 60,
        questionsPerStudent: questionsCount,
        totalMarks: totalMarks
      });

      const res = await api.post(ENDPOINTS.TEACHER_EXAM_ROOMS, {
        questionBankId: questionBankId,
        allowedStudents: students.map(s => ({
          rollNo: s.rollNumber,
          name: s.name,
          email: s.email
        })),
        courseDetails: {
          courseName: form.courseName || "",
          courseCode: form.courseCode || "",
          department: form.department || "",
          batch: form.batch || "",
          section: form.section || "",
          semester: form.semester || "",
          academicYear: form.academicYear || ""
        },
        timeLimitSec: durationMin * 60,
        questionsPerStudent: questionsCount,
        totalMarks: totalMarks,
        settings: settings
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setCreatedRoomCode(res.data.roomCode);

        setCreatedRoomCode(res.data.roomCode);
        // Form clears on remount natively since we removed localStorage
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create exam room.");
    }
  };

  /* --------------------------------
     Stepper
  -------------------------------- */

  const renderStepper = () => {
    return (
      <div className="stepper" aria-label="Create viva progress">
        {steps.map((label, index) => {
          const number = index + 1;

          const active = number === step;
          const complete = number < step;

          return (
            <div className="stepper-item" key={label}>
              <div
                className={`step-number ${
                  active ? "active" : ""
                } ${complete ? "complete" : ""}`}
              >
                {complete ? <Check size={11} /> : number}
              </div>

              <span
                className={`step-label ${
                  active ? "active" : ""
                } ${complete ? "completed-label" : ""}`}
              >
                {label}
              </span>

              {number < steps.length && <span className="step-line" />}
            </div>
          );
        })}
      </div>
    );
  };

  /* --------------------------------
     Main Render
  -------------------------------- */

  return (
    <div className="app-shell create-viva-shell">
      <Sidebar />

      <div className="main-area">
        <header className="topbar">
          <h1>Create Viva Session</h1>
        </header>

        <main className="create-viva-content">
          {renderStepper()}

          {/* =====================================================
              STEP 1 — COURSE DETAILS
          ===================================================== */}

          {step === 1 && (
            <section className="course-card">
              <div className="section-title">
                <h2>Course Details</h2>

                <p>
                  Input the foundational course information to map AI
                  examination topics.
                </p>
              </div>

              <div className="form-grid">
                <label>
                  Course Name
                  <input
                    name="courseName"
                    value={form.courseName}
                    onChange={updateForm}
                    placeholder="e.g. Distributed Systems Architecture"
                  />
                </label>

                <label>
                  Course Code
                  <input
                    name="courseCode"
                    value={form.courseCode}
                    onChange={updateForm}
                    placeholder="e.g. CS-402"
                  />
                </label>

                <label>
                  Semester
                  <input
                    name="semester"
                    value={form.semester}
                    onChange={updateForm}
                    placeholder="Spring 2026 (Default)"
                  />
                </label>

                <label>
                  Section / Batch <span>(Optional)</span>
                  <input
                    name="section"
                    value={form.section}
                    onChange={updateForm}
                    placeholder="e.g. Section A"
                  />
                </label>
              </div>

              <div className="card-actions">
                <button 
                  className="next-button" 
                  onClick={nextStep}
                  disabled={!form.courseName.trim() || !form.courseCode.trim()}
                >
                  Next: Upload Syllabus
                  <ArrowRight size={13} />
                </button>
              </div>
            </section>
          )}

          {/* =====================================================
              STEP 2 — SYLLABUS
          ===================================================== */}

          {step === 2 && (
            <section className="course-card">
              <div className="section-title">
                <h2>Upload Course Syllabus</h2>

                <p>
                  Our RAG engine processes your curriculum documents to
                  customize the AI&apos;s questioning parameters.
                </p>
              </div>

              <input
                ref={syllabusInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden-file-input"
                onChange={handleSyllabusChange}
              />

              <div
                className={`upload-box ${
                  isDraggingSyllabus ? "dragging" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingSyllabus(true);
                }}
                onDragLeave={() => setIsDraggingSyllabus(false)}
                onDrop={handleSyllabusDrop}
                onClick={() => syllabusInputRef.current?.click()}
              >
                <div className="upload-icon">
                  <UploadCloud size={22} />
                </div>

                <h3>
                  {syllabusFile
                    ? syllabusFile.name
                    : "Drag & drop your syllabus PDF here or click to browse"}
                </h3>

                <p>
                  {syllabusFile
                    ? `${(syllabusFile.size / 1024).toFixed(1)} KB selected`
                    : "Supports PDF, DOCX or TXT up to 10MB"}
                </p>

                {syllabusFile && !isProcessing && (
                  <button
                    className="remove-file-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSyllabusFile(null);
                    }}
                  >
                    <X size={13} />
                    Remove file
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="processing-card">
                  <div className="processing-header">
                    <div className="processing-title">
                      <RefreshCw size={15} className="spin" />
                      <strong>AI RAG Processing Engine</strong>
                    </div>

                    <span>Analyzing syllabus with RAG engine...</span>
                  </div>

                  <div className="processing-row">
                    <Check size={13} />
                    <span>Extracting core curriculum topics</span>
                    <strong>Done</strong>
                  </div>

                  <div className="processing-row">
                    <RefreshCw size={13} className="spin" />
                    <span>Preparing question generation</span>
                    <strong>Ready after confirmation</strong>
                  </div>

                  <div className="processing-row">
                    <RefreshCw size={13} className="spin" />
                    <span>Mapping standard learning objectives</span>
                    <strong>Analyzing...</strong>
                  </div>
                </div>
              )}

              <div className="card-actions split-actions">
                <button className="back-button" onClick={previousStep}>
                  <ChevronLeft size={13} />
                  Back
                </button>

                <button
                  className="next-button"
                  disabled={!syllabusFile || isProcessing}
                  onClick={() => setStep(3)}
                >
                  Continue to Question Setup
                  <ArrowRight size={13} />
                </button>
              </div>
            </section>
          )}

          {/* =====================================================
              STEP 3 — QUESTIONS
          ===================================================== */}

          {step === 3 && (
            <section className="course-card questions-card">
              {!questionsGenerated ? (
                isProcessing ? (
                  <div className="processing-card">
                    <div className="processing-header">
                      <div className="processing-title">
                        <RefreshCw size={15} className="spin" />
                        <strong>Generating AI Questions</strong>
                      </div>
                      <span>Please wait while the AI analyzes the syllabus and creates questions...</span>
                    </div>
                    <div className="processing-row">
                      <Check size={13} />
                      <span>Reading syllabus content</span>
                      <strong>Done</strong>
                    </div>
                    <div className="processing-row">
                      <RefreshCw size={13} className="spin" />
                      <span>Drafting {questionCount} {questionDifficulty.toLowerCase()} questions</span>
                      <strong>Processing...</strong>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="section-title">
                      <h2>Question Generation</h2>
                      <p>
                        Your syllabus has been processed. Choose how many
                        questions to generate and set their difficulty level.
                      </p>
                    </div>

                    <div className="question-setup-grid">
                      <label>
                        Number of Questions
                        <select
                          value={questionCount}
                          onChange={(e) => setQuestionCount(e.target.value)}
                        >
                          {[5, 10, 15, 20, 25].map((count) => (
                            <option key={count} value={count}>
                              {count} questions
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Difficulty Level
                        <select
                          value={questionDifficulty}
                          onChange={(e) => setQuestionDifficulty(e.target.value)}
                        >
                          <option>Easy</option>
                          <option>Moderate</option>
                          <option>Hard</option>
                        </select>
                      </label>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="questions-header">
                    <div className="section-title">
                      <h2>
                        Generated Questions{" "}
                        <span className="question-count">
                          ({questions.length} found)
                        </span>
                      </h2>
                      <p>Review the generated questions before continuing to students.</p>
                    </div>

                    <div className="questions-header-actions">
                      <button
                        className="outline-action"
                        onClick={generateQuestions}
                      >
                        <RefreshCw size={13} />
                        Regenerate
                      </button>
                      <button
                        className="add-question-button"
                        onClick={() => setShowAddQuestion(true)}
                      >
                        <Plus size={13} />
                        Add Manually
                      </button>
                    </div>
                  </div>

                  <div className="questions-list">
                    {questions.map((question, index) => (
                      <div className="question-item" key={question.id}>
                        <div className="question-number">{index + 1}</div>
                        <div className="question-content">
                          <p>{question.text}</p>
                          <div className="question-tags">
                            <span className={`difficulty-tag ${question.difficulty.toLowerCase()}`}>
                              {question.difficulty}
                            </span>
                            <span className="topic-tag">{question.topic}</span>
                          </div>
                          
                          <div style={{ marginTop: '12px' }}>
                            {question.audio_file ? (
                              <audio controls src={fileUrl(ENDPOINTS.AUDIO_FILE(syllabusId, question.audio_file))} style={{ height: '32px' }} />
                            ) : (
                              <span style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RefreshCw size={12} className="spin" />
                                Generating audio in background...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="question-actions">
                          <button
                            title="Regenerate"
                            onClick={() => regenerateQuestion(question.id)}
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            className="delete-question"
                            title="Delete"
                            onClick={() => deleteQuestion(question.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showAddQuestion && (
                    <div className="inline-editor">
                      <textarea
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="Enter a custom viva question..."
                      />

                      <div className="inline-editor-actions">
                        <button
                          className="back-button"
                          onClick={() => setShowAddQuestion(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="next-button"
                          onClick={addCustomQuestion}
                        >
                          Add Question
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="card-actions split-actions">
                <button
                  className="back-button"
                  onClick={previousStep}
                  disabled={isProcessing}
                >
                  <ChevronLeft size={13} />
                  Back
                </button>

                <button
                  className="next-button"
                  onClick={questionsGenerated ? nextStep : generateQuestions}
                  disabled={(questionsGenerated && questions.length === 0) || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={13} className="spin" />
                      Generating...
                    </>
                  ) : questionsGenerated ? (
                    <>Confirm Questions & Continue <ArrowRight size={13} /></>
                  ) : (
                    <>Generate Questions <ArrowRight size={13} /></>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* =====================================================
              STEP 4 — STUDENTS
          ===================================================== */}

          {step === 4 && (
            <section className="course-card students-card">
              <div className="section-title">
                <h2>Upload Student Roll Numbers</h2>

                <p>
                  Provide the student roster for this viva session. You
                  can upload a standard CSV or Excel template.
                </p>
              </div>

              <input
                ref={studentInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden-file-input"
                onChange={handleStudentChange}
              />

              <div
                className={`upload-box student-upload ${
                  isDraggingStudents ? "dragging" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingStudents(true);
                }}
                onDragLeave={() => setIsDraggingStudents(false)}
                onDrop={handleStudentDrop}
                onClick={() => studentInputRef.current?.click()}
              >
                <div className="upload-icon">
                  <FileText size={21} />
                </div>

                <h3>
                  {studentFile
                    ? studentFile.name
                    : "Drag & drop your student list (CSV, XLSX) here or click to browse"}
                </h3>

                <p>
                  Make sure columns match: Roll Number, Name, Email
                </p>
              </div>

              <div className="roster-section">
                <div className="roster-heading">
                  <h3>
                    Uploaded Roster Preview{" "}
                    <span>({students.length} Students Loaded)</span>
                  </h3>
                </div>

                <div className="student-table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Email Address</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {students.map((student) => (
                        <tr key={student.rollNumber}>
                          <td>{student.rollNumber}</td>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>
                            <span className="ready-tag">Ready</span>
                          </td>
                          <td>
                            <button
                              className="table-delete"
                              onClick={() =>
                                removeStudent(student.rollNumber)
                              }
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showAddStudent && (
                <div className="student-editor">
                  <h3>Add Student Manually</h3>

                  <div className="student-form-grid">
                    <input
                      placeholder="Roll Number"
                      value={newStudent.rollNumber}
                      onChange={(e) =>
                        setNewStudent((previous) => ({
                          ...previous,
                          rollNumber: e.target.value,
                        }))
                      }
                    />

                    <input
                      placeholder="Student Name"
                      value={newStudent.name}
                      onChange={(e) =>
                        setNewStudent((previous) => ({
                          ...previous,
                          name: e.target.value,
                        }))
                      }
                    />

                    <input
                      placeholder="Email Address"
                      value={newStudent.email}
                      onChange={(e) =>
                        setNewStudent((previous) => ({
                          ...previous,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="inline-editor-actions">
                    <button
                      className="back-button"
                      onClick={() => setShowAddStudent(false)}
                    >
                      Cancel
                    </button>

                    <button
                      className="next-button"
                      onClick={addStudent}
                    >
                      Add Student
                    </button>
                  </div>
                </div>
              )}

              <div className="card-actions split-actions">
                <button
                  className="back-button"
                  onClick={previousStep}
                >
                  <ChevronLeft size={13} />
                  Back
                </button>

                <div className="student-bottom-actions">
                  <button
                    className="add-student-button"
                    onClick={() => setShowAddStudent(true)}
                  >
                    <Plus size={13} />
                    Add Student Manually
                  </button>

                  <button
                    className="next-button"
                    onClick={nextStep}
                    disabled={students.length === 0}
                  >
                    Next: Configure Settings
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =====================================================
              STEP 5 — SETTINGS
          ===================================================== */}

          {step === 5 && (
            <div className="settings-layout">
              <section className="course-card settings-card">
                <div className="section-title">
                  <h2>Configure Viva Parameters</h2>

                  <p>
                    Tailor how the AI examiner behaves, limits oral durations,
                    and monitors exam integrity.
                  </p>
                </div>

                <div className="difficulty-section">
                  <label>Difficulty Level</label>

                  <div className="difficulty-options">
                    {[
                      ["Easy", "Foundational concepts, structured definitions"],
                      ["Moderate", "Analysis of theory, architectural trade-offs"],
                      ["Hard", "Advanced scenarios, design patterns, optimizations"],
                    ].map(([label, description]) => (
                      <button
                        key={label}
                        className={`difficulty-option ${
                          settings.difficulty === label ? "selected" : ""
                        }`}
                        onClick={() => updateSettings("difficulty", label)}
                      >
                        <strong>{label}</strong>
                        <span>{description}</span>
                        {settings.difficulty === label && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-controls">
                  <div className="setting-field">
                    <label>Question Limit per Student</label>

                    <div className="number-control">
                      <span>{settings.questionsPerStudent} Questions (Default)</span>
                      <button
                        aria-label="Decrease questions per student"
                        onClick={() =>
                          updateSettings(
                            "questionsPerStudent",
                            String(Math.max(1, Number(settings.questionsPerStudent) - 1))
                          )
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        aria-label="Increase questions per student"
                        onClick={() =>
                          updateSettings(
                            "questionsPerStudent",
                            String(Number(settings.questionsPerStudent) + 1)
                          )
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="setting-field">
                    <label>Total Marks per Session</label>

                    <div className="number-control">
                      <span>
                        {settings.totalMarks || "15"} Marks (~{(
                          (Number(settings.totalMarks || 15) / Math.max(1, Number(settings.questionsPerStudent || 5)))
                        ).toFixed(1)} / Q)
                      </span>
                      <button
                        aria-label="Decrease total marks"
                        onClick={() =>
                          updateSettings(
                            "totalMarks",
                            String(Math.max(5, Number(settings.totalMarks || 15) - 5))
                          )
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        aria-label="Increase total marks"
                        onClick={() =>
                          updateSettings(
                            "totalMarks",
                            String(Number(settings.totalMarks || 15) + 5)
                          )
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="setting-field">
                    <label>Time Limit per Student</label>

                    <select
                      value={settings.duration}
                      onChange={(e) => updateSettings("duration", e.target.value)}
                    >
                      <option value="5">5 Minutes</option>
                      <option value="10">10 Minutes</option>
                      <option value="15">15 Minutes</option>
                      <option value="20">20 Minutes</option>
                      <option value="25">25 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="toggle-settings">
                <div className="toggle-setting">
                  <div>
                    <strong>Allow Re-Viva Request</strong>
                    <span>
                      Enable students to request another attempt if technical discrepancies are detected.
                    </span>
                  </div>

                  <button
                    className={`toggle ${
                      settings.allowReviva ? "on" : ""
                    }`}
                    onClick={() =>
                      updateSettings(
                        "allowReviva",
                        !settings.allowReviva
                      )
                    }
                  >
                    <span />
                  </button>
                </div>

                <div className="toggle-setting">
                  <div>
                    <strong>Real-Time Integrity Flagging</strong>
                    <span>
                      Monitor secure microphone audio data and generate automated cheating risk reports.
                    </span>
                  </div>

                  <button
                    className={`toggle ${
                      settings.integrityFlagging ? "on" : ""
                    }`}
                    onClick={() =>
                      updateSettings(
                        "integrityFlagging",
                        !settings.integrityFlagging
                      )
                    }
                  >
                    <span />
                  </button>
                </div>

                </div>

                <div className="card-actions split-actions">
                  <button className="back-button" onClick={previousStep}>
                    <ChevronLeft size={13} />
                    Back
                  </button>

                  <button className="next-button" onClick={nextStep}>
                    Review &amp; Start Viva
                    <ArrowRight size={13} />
                  </button>
                </div>
              </section>

              <aside className="session-summary">
                <h2>Session Summary</h2>

                <dl>
                  <div>
                    <dt>Course Name</dt>
                    <dd>{form.courseName || "Distributed Systems Architectures"}</dd>
                  </div>
                  <div>
                    <dt>Total Students</dt>
                    <dd>{students.length} Roster List</dd>
                  </div>
                  <div>
                    <dt>Viva Syllabus</dt>
                    <dd>{syllabusFile?.name || "ABET Standard Mapped"}</dd>
                  </div>
                  <div>
                    <dt>Target Questions</dt>
                    <dd>{settings.questionsPerStudent} Prompts Mapped</dd>
                  </div>
                  <div>
                    <dt>Total Viva Marks</dt>
                    <dd>{settings.totalMarks || "15"} Marks</dd>
                  </div>
                  <div>
                    <dt>Est. Total Hours</dt>
                    <dd>
                      {((students.length * Number(settings.duration)) / 60).toFixed(1)} Academic Hours
                    </dd>
                  </div>
                </dl>

              </aside>
            </div>
          )}

          {/* =====================================================
              STEP 6 — FINAL REVIEW
          ===================================================== */}

          {step === 6 && (
            <section className="course-card final-review-card">
              <div className="section-title">
                <h2>Review Viva Session</h2>

                <p>
                  Review your examination configuration before creating
                  the viva session.
                </p>
              </div>

              <div className="review-grid">
                <div className="review-box">
                  <div className="review-box-icon">
                    <FileText size={17} />
                  </div>

                  <div>
                    <span>Course</span>
                    <strong>
                      {form.courseName || "Distributed Systems"}
                    </strong>
                    <small>
                      {form.courseCode || "CS-402"}
                    </small>
                  </div>
                </div>

                <div className="review-box">
                  <div className="review-box-icon">
                    <Users size={17} />
                  </div>

                  <div>
                    <span>Students</span>
                    <strong>{students.length}</strong>
                    <small>Students loaded</small>
                  </div>
                </div>

                <div className="review-box">
                  <div className="review-box-icon">
                    <FileText size={17} />
                  </div>

                  <div>
                    <span>Questions</span>
                    <strong>{questions.length}</strong>
                    <small>Approved questions</small>
                  </div>
                </div>

                <div className="review-box">
                  <div className="review-box-icon">
                    <Settings size={17} />
                  </div>

                  <div>
                    <span>Duration</span>
                    <strong>{settings.duration} min</strong>
                    <small>
                      {settings.questionsPerStudent} questions/student
                    </small>
                  </div>
                </div>
              </div>

              <div className="review-summary">
                <h3>Examination Summary</h3>

                <div className="summary-row">
                  <span>Syllabus</span>
                  <strong>
                    {syllabusFile?.name || "Course Syllabus"}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Difficulty</span>
                  <strong>{settings.difficulty}</strong>
                </div>

                <div className="summary-row">
                  <span>Total Viva Marks</span>
                  <strong>{settings.totalMarks || "15"} Marks (~{((Number(settings.totalMarks || 15)) / Math.max(1, Number(settings.questionsPerStudent || 5))).toFixed(1)} marks/question)</strong>
                </div>

                <div className="summary-row">
                  <span>Randomize Questions</span>
                  <strong>
                    {settings.randomizeQuestions ? "Enabled" : "Disabled"}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>AI Proctoring</span>
                  <strong>
                    {settings.enableProctoring
                      ? "Enabled"
                      : "Disabled"}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Audio Analysis</span>
                  <strong>
                    {settings.audioAnalysis ? "Enabled" : "Disabled"}
                  </strong>
                </div>
              </div>

              <div className="card-actions split-actions">
                <button
                  className="back-button"
                  onClick={previousStep}
                >
                  <ChevronLeft size={13} />
                  Back
                </button>

                <button
                  className="next-button create-session-button"
                  onClick={createVivaSession}
                >
                  Create Viva Session
                  <Check size={14} />
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {createdRoomCode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '10px', color: '#111827', fontSize: '20px', fontWeight: '600' }}>Viva Session Created!</h2>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>Your examination room is ready. Share this 6-digit code with your students so they can join.</p>
            <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '4px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '15px', borderRadius: '8px', marginBottom: '24px' }}>
              {createdRoomCode}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500', color: '#374151' }}
                onClick={() => {
                  navigator.clipboard.writeText(createdRoomCode);
                  alert("Code copied to clipboard!");
                }}
              >
                Copy Code
              </button>
              <button 
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '500' }}
                onClick={() => window.location.href = "/dashboard"}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import { setAuthSession } from "../../../utils/authSession";
import { ROLES } from "../../../constants/roles";
import { storage } from "../../../utils/storage";
import { STORAGE_KEYS } from "../../../constants/storage";
import { GraduationCap, UserRound } from "lucide-react";
import AuthInput from "../components/AuthInput";
import PasswordInput from "../components/PasswordInput";
import AuthButton from "../components/AuthButton";
import "../styles/Auth.css";
import "../styles/Login.css";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Role can be 'teacher' or 'student'
  const [role, setRole] = useState("teacher");
  const [error, setError] = useState(null);

  // Teacher state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Student state
  const [studentAccess, setStudentAccess] = useState({
    joinCode: "",
    rollNumber: ""
  });

  // Check URL params for student join link
  useEffect(() => {
    const roomParam = searchParams.get('room');
    const rollParam = searchParams.get('roll');
    if (roomParam || rollParam) {
      setRole("student");
      setStudentAccess({
        joinCode: roomParam || "",
        rollNumber: rollParam || ""
      });
    }
  }, [searchParams]);

  const updateStudentAccess = (event) => {
    const { name, value } = event.target;
    setStudentAccess((current) => ({ ...current, [name]: value }));
    setError(null);
  };

  const handleTeacherLogin = async () => {
    try {
      const response = await api.post(
        ENDPOINTS.AUTH_LOGIN,
        { email, password },
        { skipUnauthorizedHandler: true }
      );
      if (response.data.success) {
        setAuthSession(ROLES.TEACHER, response.data.token);
        storage.set(STORAGE_KEYS.TEACHER_INFO, JSON.stringify(response.data.teacher));
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  const handleStudentJoin = async () => {
    if (!studentAccess.joinCode.trim() || !studentAccess.rollNumber.trim()) {
      setError("Enter your join code and roll number to continue.");
      return;
    }
    
    try {
      // Verify room exists and student is enrolled
      const res = await api.get(ENDPOINTS.VIVA_ROOM(studentAccess.joinCode), {
        params: { rollNo: studentAccess.rollNumber },
        skipUnauthorizedHandler: true,
      });
      const studentName = res.data.studentName || "Student";
      navigate(`/student-portal?roomCode=${studentAccess.joinCode}&rollNo=${studentAccess.rollNumber}&name=${encodeURIComponent(studentName)}`);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid join code or roll number.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (role === "teacher") {
      await handleTeacherLogin();
    } else {
      await handleStudentJoin();
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-content">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"><span>⌁</span></div>
            <span>CodeViva</span>
          </div>
          <div className="brand-copy">
            <h1>AI-Powered Viva<br />Examinations</h1>
            <p>
              Elevate academic assessment with real-time oral exams.
              Generate topic-mapped syllabus questions, grade automatically,
              and ensure integrity with secure student audio analysis.
            </p>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card auth-card-login">
          <div className="auth-heading">
            <h2>{role === "teacher" ? "Welcome Back" : "Join Viva Session"}</h2>
            <p>{role === "teacher" ? "Log in to your CodeViva teacher dashboard." : "Enter your join code and roll number."}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="role-selector">
              <legend>Log in as</legend>
              <div className="role-options">
                <button
                  type="button"
                  className={`role-option ${role === "teacher" ? "selected" : ""}`}
                  onClick={() => {
                    setRole("teacher");
                    setError(null);
                  }}
                >
                  <GraduationCap size={17} />
                  <span>Teacher</span>
                </button>

                <button
                  type="button"
                  className={`role-option ${role === "student" ? "selected" : ""}`}
                  onClick={() => {
                    setRole("student");
                    setError(null);
                  }}
                >
                  <UserRound size={17} />
                  <span>Student</span>
                </button>
              </div>
            </fieldset>

            {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px', fontSize: '13px' }}>{error}</div>}

            {role === "teacher" ? (
              <>
                <AuthInput
                  id="email"
                  label="Email Address"
                  type="email"
                  placeholder="Enter Your Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <PasswordInput
                  id="password"
                  label="Password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <div className="forgot-row">
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              </>
            ) : (
              <>
                <AuthInput
                  id="joinCode"
                  name="joinCode"
                  label="Join Code"
                  placeholder="123456"
                  value={studentAccess.joinCode}
                  onChange={updateStudentAccess}
                  autoComplete="off"
                />

                <AuthInput
                  id="rollNumber"
                  name="rollNumber"
                  label="Roll Number"
                  placeholder="20SW123"
                  value={studentAccess.rollNumber}
                  onChange={updateStudentAccess}
                  autoComplete="off"
                />
              </>
            )}

            <AuthButton>
              {role === "teacher" ? "Log In" : "Join Session"}
            </AuthButton>
          </form>

          {role === "teacher" && (
            <p className="auth-switch">
              Don't have an account? <Link to="/register">Create account</Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
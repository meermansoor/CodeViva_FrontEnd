import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../services/api";
import { ENDPOINTS } from "../../../constants/endpoints";
import AuthInput from "../components/AuthInput";
import PasswordInput from "../components/PasswordInput";
import AuthButton from "../components/AuthButton";
import "../styles/Auth.css";
import "../styles/Register.css";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Register({ onRegistered }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      const res = await api.post(
        ENDPOINTS.AUTH_REGISTER,
        {
          name: form.fullName,
          email: form.email,
          password: form.password,
        },
        { skipUnauthorizedHandler: true }
      );
      if (res.data.success) {
        onRegistered?.();
        navigate("/login");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register account.");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="CodeViva introduction">
        <div className="brand-content">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span>⌁</span>
            </div>
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
        <div className="auth-card">
          <div className="auth-heading">
            <h2>Get Started</h2>
            <p>Create your CodeViva teacher account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <AuthInput
              id="fullName"
              name="fullName"
              label="Full Name"
              placeholder="Dr. Sarah Smith"
              value={form.fullName}
              onChange={update}
              autoComplete="name"
            />

            <AuthInput
              id="email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="sarah.smith@university.edu"
              value={form.email}
              onChange={update}
              autoComplete="email"
            />

            <PasswordInput
              id="password"
              name="password"
              label="Password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={update}
              autoComplete="new-password"
            />

            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="••••••••••••"
              value={form.confirmPassword}
              onChange={update}
              autoComplete="new-password"
            />

            {error && <p className="auth-error" role="alert" style={{ color: 'red', fontSize: '13px', marginTop: '10px' }}>{error}</p>}

            <AuthButton>Create Account</AuthButton>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
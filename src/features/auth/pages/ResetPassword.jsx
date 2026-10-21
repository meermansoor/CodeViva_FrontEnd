import { useState } from "react";
import { Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import AuthButton from "../components/AuthButton";
import "../styles/Auth.css";
import "../styles/Login.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    // Connect reset-password API here.
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
            <p>Secure, intelligent and efficient oral assessment for modern educators.</p>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card auth-card-login">
          <div className="auth-heading">
            <h2>Create New Password</h2>
            <p>Choose a strong password for your CodeViva account.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <PasswordInput
              id="password"
              label="New Password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              placeholder="••••••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />

            {error && <p className="auth-error" role="alert">{error}</p>}
            <AuthButton>Update Password</AuthButton>
          </form>

          <p className="auth-switch">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
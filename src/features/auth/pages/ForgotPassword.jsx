import { useState } from "react";
import { Link } from "react-router-dom";
import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import "../styles/Auth.css";
import "../styles/Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSent(true);
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
            <h2>Reset Password</h2>
            <p>Enter your email and we'll send you a password reset link.</p>
          </div>

          {sent ? (
            <div className="success-message">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <AuthInput
                id="email"
                label="Email Address"
                type="email"
                placeholder="sarah.smith@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <AuthButton>Send Reset Link</AuthButton>
            </form>
          )}

          <p className="auth-switch">
            Remember your password? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
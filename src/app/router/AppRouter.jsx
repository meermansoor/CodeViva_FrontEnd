import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Analytics from "../../features/analytics/pages/Analytics";
import ForgotPassword from "../../features/auth/pages/ForgotPassword";
import Login from "../../features/auth/pages/Login";
import Register from "../../features/auth/pages/Register";
import ResetPassword from "../../features/auth/pages/ResetPassword";
import Dashboard from "../../features/dashboard/pages/Dashboard";
import LiveMonitoring from "../../features/live-monitoring/pages/LiveMonitoring";
import SessionResults from "../../features/results/pages/SessionResults";
import StudentResults from "../../features/results/pages/StudentResults";
import CreateViva from "../../features/sessions/pages/CreateViva";
import Students from "../../features/students/pages/students";
import StudentPortalRouter from "../../features/student-portal/router/StudentPortalRouter";

// Helper component to redirect old email links while keeping the query params
function StudentRedirect() {
  const location = useLocation();
  return <Navigate to={`/login${location.search}`} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sessions" element={<CreateViva />} />
      <Route path="/students" element={<Students />} />
      <Route path="/live-monitoring" element={<LiveMonitoring />} />
      <Route path="/results" element={<SessionResults />} />
      <Route path="/student-results" element={<StudentResults />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/student-portal/*" element={<StudentPortalRouter />} />
      <Route path="/student" element={<StudentRedirect />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

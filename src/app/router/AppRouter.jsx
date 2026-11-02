import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
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

// Helper component to redirect student links (including space variations or legacy paths) to /student-portal
function StudentRedirect() {
  const location = useLocation();
  return <Navigate to={`${ROUTES.STUDENT_PORTAL}${location.search}`} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
      <Route path={ROUTES.SESSIONS} element={<CreateViva />} />
      <Route path={ROUTES.STUDENTS} element={<Students />} />
      <Route path={ROUTES.LIVE_MONITORING} element={<LiveMonitoring />} />
      <Route path={ROUTES.RESULTS} element={<SessionResults />} />
      <Route path={ROUTES.STUDENT_RESULTS} element={<StudentResults />} />
      <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
      <Route path={`${ROUTES.STUDENT_PORTAL}/*`} element={<StudentPortalRouter />} />
      <Route path={ROUTES.STUDENT_PORTAL} element={<StudentPortalRouter />} />
      <Route path="/student portal/*" element={<StudentRedirect />} />
      <Route path="/student portal" element={<StudentRedirect />} />
      <Route path="/student%20portal/*" element={<StudentRedirect />} />
      <Route path="/student%20portal" element={<StudentRedirect />} />
      <Route path="/student/*" element={<StudentRedirect />} />
      <Route path="/student" element={<StudentRedirect />} />
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}

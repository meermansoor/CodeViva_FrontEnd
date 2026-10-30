import {
  CalendarDays,
  LineChart,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import RecentSessions from "../components/RecentSessions";
import QuickActions from "../components/QuickActions";
import UpcomingSchedule from "../components/UpcomingSchedule";

import "../styles/dashboard.css";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: "-",
    activeStudents: "-",
    averageScore: "-",
    upcomingVivas: "-",
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        if (!token) return;

        const [dashRes, roomsRes, sessionsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/teacher/dashboard", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false, data: {} } })),
          axios.get("http://localhost:5000/api/teacher/exam-rooms", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false, data: [] } })),
          axios.get("http://localhost:5000/api/teacher/sessions", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false, data: [] } }))
        ]);

        const allRooms = roomsRes.data.success && roomsRes.data.data ? roomsRes.data.data : [];
        const activeRooms = allRooms.filter(room => room.isActive);
        const roomsCount = allRooms.length;
        const activeRoomsCount = activeRooms.length;

        const allStudentSessions = sessionsRes.data.success && sessionsRes.data.data ? sessionsRes.data.data : [];
        const inProgressCount = allStudentSessions.filter(s => s.status === 'IN_PROGRESS').length;

        const metrics = dashRes.data.success && dashRes.data.data.summary_metrics ? dashRes.data.data.summary_metrics : {};
        
        setStats({
          totalSessions: roomsCount,
          activeStudents: inProgressCount > 0 ? inProgressCount : (metrics.total_students || 0),
          averageScore: metrics.overall_average_score ? `${metrics.overall_average_score.toFixed(1)}%` : "0%",
          upcomingVivas: activeRoomsCount,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-is-open" : ""}`}>
      {/* ================= SIDEBAR ================= */}
      <Sidebar onNavigate={() => setSidebarOpen(false)} />
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />

      {/* ================= MAIN AREA ================= */}
      <div className="main-area">

        {/* TOPBAR + PROFILE MENU */}
        <Topbar
          sidebarOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
        />

        {/* ================= DASHBOARD CONTENT ================= */}
        <main className="dashboard-content">

          {/* ================= STAT CARDS ================= */}
          <section className="stats-grid">

            <StatCard
              label="Total Sessions"
              value={stats.totalSessions}
              icon={CalendarDays}
              tone="purple"
            />

            <StatCard
              label="Active Students"
              value={stats.activeStudents}
              icon={Users}
              tone="teal"
            />

            <StatCard
              label="Average Score"
              value={stats.averageScore}
              icon={LineChart}
              tone="green"
            />

            <StatCard
              label="Active Exam Rooms"
              value={stats.upcomingVivas}
              icon={CalendarDays}
              tone="orange"
            />

          </section>

          {/* ================= LOWER DASHBOARD ================= */}
          <section className="dashboard-grid">

            {/* LEFT */}
            <RecentSessions />

            {/* RIGHT */}
            <div className="right-column">

              <QuickActions />

              <UpcomingSchedule />

            </div>

          </section>

        </main>
      </div>
    </div>
  );
}
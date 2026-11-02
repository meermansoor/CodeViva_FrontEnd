import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  LayoutDashboard,
  Settings,
  Users,
  Video,
} from "lucide-react";

const items = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Create Session", to: "/sessions", icon: Video },
  { label: "Students", to: "/students", icon: Users },
  {label: "Live Monitoring", to: "/live-monitoring", icon: Video},
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "Analytics", to: "/analytics", icon: Settings },
];
import { useEffect, useState } from "react";
import { storage } from "../../../utils/storage";
import { STORAGE_KEYS } from "../../../constants/storage";

export default function Sidebar({ onNavigate }) {
  const [teacher, setTeacher] = useState({ name: "Teacher", email: "" });

  useEffect(() => {
    try {
      const stored = storage.get(STORAGE_KEYS.TEACHER_INFO);
      if (stored) {
        setTeacher(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const initials = teacher.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <BookOpenCheck size={17} strokeWidth={2.4} />
        </div>
        <span>CodeViva</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={15} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="profile-card">
        <div className="avatar avatar-photo">{initials}</div>
        <div className="profile-copy">
          <strong>{teacher.name}</strong>
          <span>Assistant Professor</span>
        </div>
      </div>
    </aside>
  );
}
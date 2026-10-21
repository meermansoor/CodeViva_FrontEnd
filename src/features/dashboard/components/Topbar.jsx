import { Bell, Menu, X } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

export default function Topbar({ sidebarOpen, onMenuToggle }) {
  return (
    <header className="topbar">
      <button
        className="menu-button"
        type="button"
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
        onClick={onMenuToggle}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="topbar-title">
        <h1>Teacher Dashboard</h1>
        <p>Manage your AI-powered viva sessions</p>
      </div>

      <div className="topbar-actions">
        {/* Notifications */}
        <button
          className="notification-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={17} strokeWidth={1.9} />
          <span className="notification-dot" />
        </button>

        <ProfileMenu />

      </div>
    </header>
  );
}
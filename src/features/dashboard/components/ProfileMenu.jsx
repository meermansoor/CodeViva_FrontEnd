import { useEffect, useRef, useState } from "react";
import {
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState({ name: "Teacher", email: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("teacherInfo");
      if (stored) {
        setTeacher(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const initials = teacher.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    setOpen(false);

    // Remove authentication data if you are using localStorage
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherInfo");

    navigate("/login");
  };

  return (
    <div className="profile-menu-wrapper" ref={menuRef}>
      {/* =================================================
          AVATAR BUTTON
      ================================================= */}
      <button
        className={`profile-avatar-button ${
          open ? "profile-avatar-active" : ""
        }`}
        onClick={() => setOpen((previous) => !previous)}
        aria-label="Teacher profile menu"
        aria-expanded={open}
      >
        <div className="profile-avatar">
          {initials}
        </div>

        <ChevronDown
          size={13}
          className={`profile-chevron ${
            open ? "rotate" : ""
          }`}
        />
      </button>

      {/* =================================================
          DROPDOWN
      ================================================= */}
      {open && (
        <div className="profile-dropdown">

          {/* PROFILE HEADER */}
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-avatar">
              {initials}
            </div>

            <div className="profile-dropdown-info">
              <strong>{teacher.name}</strong>
              <span>Assistant Professor</span>
            </div>
          </div>

          <div className="profile-divider" />

          {/* PROFILE */}
          <button
            className="profile-dropdown-item"
            onClick={handleProfile}
          >
            <User size={16} />

            <div>
              <strong>My Profile</strong>
              <span>View your profile</span>
            </div>
          </button>

          <div className="profile-divider" />

          {/* LOGOUT */}
          <button
            className="profile-dropdown-item logout-item"
            onClick={handleLogout}
          >
            <LogOut size={16} />

            <div>
              <strong>Logout</strong>
              <span>Sign out of CodeViva</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
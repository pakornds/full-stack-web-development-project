import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../services/authService";

interface LeaveLayoutProps {
  children: React.ReactNode;
  userRole: string;
  departmentName?: string;
}

const LeaveLayout: React.FC<LeaveLayoutProps> = ({ children, userRole, departmentName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(path);

  // Close sidebar when route changes (derived state pattern per React docs)
  if (prevPath !== path) {
    setPrevPath(path);
    setIsSidebarOpen(false);
  }

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="leave-page">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <span className="brand-icon">📋</span>
          <span className="brand-text">Leave Portal</span>
        </div>
        <button className="burger-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          ☰
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <nav className={`leave-sidebar ${isSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">📋</span>
          <span className="brand-text">Leave Portal</span>
          <button className="mobile-close-btn" onClick={closeSidebar}>✕</button>
        </div>
        <div className="sidebar-nav">
          <button
            className={`sidebar-link ${path.startsWith("/dashboard/personal") ? "active" : ""}`}
            onClick={() => navigate("/dashboard/personal")}
          >
            <span className="link-icon">👤</span>{" "}My Leave
          </button>

          {(userRole === "manager" || userRole === "admin") && (
            <button
              className={`sidebar-link ${path === "/dashboard/department" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/department")}
            >
              <span className="link-icon">🏢</span>{" "}Department
            </button>
          )}

          {(userRole === "admin" || departmentName === "Human Resources") && (
            <button
              className={`sidebar-link ${path === "/dashboard/logs" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/logs")}
            >
              <span className="link-icon">📊</span>{" "}Leave Logs
            </button>
          )}
        </div>
        <div className="sidebar-footer">
          <button
            className="sidebar-link"
            onClick={() => navigate("/dashboard")}
            style={{ display: "none" }} // Hidden since we replaced Dashboard completely
          >
            <span className="link-icon">🏠</span>{" "}Dashboard
          </button>
          <button className="sidebar-link logout" onClick={handleLogout}>
            <span className="link-icon">🚪</span>{" "}Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {children}
    </div>
  );
};

export default LeaveLayout;

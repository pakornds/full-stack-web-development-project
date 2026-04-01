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
          <svg className="brand-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
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
          <svg className="brand-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          <span className="brand-text">Leave Portal</span>
          <button className="mobile-close-btn" onClick={closeSidebar}>✕</button>
        </div>
        <div className="sidebar-nav">
          <button
            className={`sidebar-link ${path.startsWith("/dashboard/personal") ? "active" : ""}`}
            onClick={() => navigate("/dashboard/personal")}
          >
            <svg className="link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{" "}My Leave
          </button>

          {(userRole === "manager" || userRole === "admin") && (
            <button
              className={`sidebar-link ${path === "/dashboard/department" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/department")}
            >
              <svg className="link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>{" "}Department
            </button>
          )}

          {(userRole === "admin" || departmentName === "Human Resources") && (
            <button
              className={`sidebar-link ${path === "/dashboard/logs" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/logs")}
            >
              <svg className="link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>{" "}Leave Logs
            </button>
          )}
        </div>
        <div className="sidebar-footer">
          <button className="sidebar-link logout" onClick={handleLogout}>
            <svg className="link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>{" "}Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {children}
    </div>
  );
};

export default LeaveLayout;

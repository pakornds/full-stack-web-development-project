import React from "react";
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="leave-page">
      {/* Sidebar */}
      <nav className="leave-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">📋</span>
          <span className="brand-text">Leave Portal</span>
        </div>
        <div className="sidebar-nav">
          <button
            className={`sidebar-link ${path.startsWith("/dashboard/personal") ? "active" : ""}`}
            onClick={() => navigate("/dashboard/personal")}
          >
            <span className="link-icon">👤</span>
            My Leave
          </button>

          {(userRole === "manager" || userRole === "admin") && (
            <button
              className={`sidebar-link ${path === "/dashboard/department" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/department")}
            >
              <span className="link-icon">🏢</span>
              Department
            </button>
          )}

          {(userRole === "admin" || departmentName === "Human Resources") && (
            <button
              className={`sidebar-link ${path === "/dashboard/logs" ? "active" : ""}`}
              onClick={() => navigate("/dashboard/logs")}
            >
              <span className="link-icon">📊</span>
              Leave Logs
            </button>
          )}
        </div>
        <div className="sidebar-footer">
          <button
            className="sidebar-link"
            onClick={() => navigate("/dashboard")}
            style={{ display: "none" }} // Hidden since we replaced Dashboard completely
          >
            <span className="link-icon">🏠</span>
            Dashboard
          </button>
          <button className="sidebar-link logout" onClick={handleLogout}>
            <span className="link-icon">🚪</span>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {children}
    </div>
  );
};

export default LeaveLayout;

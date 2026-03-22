import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getManagerDashboardData,
  logoutUser,
  DashboardData,
} from "../services/authService";

const ManagerDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    getManagerDashboardData()
      .then(setData)
      .catch(() => {
        setError("Access denied or session expired.");
        setTimeout(() => navigate("/login"), 2000);
      });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const renderContent = () => {
    if (error) return <p className="error-text">{error}</p>;
    if (!data) return <p>Loading manager data...</p>;
    return (
      <div className="user-info">
        <div className="avatar avatar-manager">
          {String(data.user.name)?.[0]?.toUpperCase()}
        </div>
        <h3>Hello, {data.user.name}!</h3>
        <p className="text-muted">{data.user.email}</p>
        <p className="badge">{data.message}</p>
        <div className="permissions-box">
          <h4>Permissions</h4>
          <ul>
            {data.stats.permissions.map((p) => (
              <li key={p} className="permission-item">
                ✓ {p.split("_").join(" ")}
              </li>
            ))}
          </ul>
        </div>
        <div className="permissions-box" style={{ marginTop: "12px" }}>
          <h4>System Info</h4>
          <p>API Uptime: {data.stats.apiUptime}</p>
          <p>Node: {data.stats.nodeVersion}</p>
          <p>Env: {data.stats.environment}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card role-manager">
        <div className="role-badge manager-badge">MANAGER</div>
        <h2>Manager Dashboard</h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default ManagerDashboard;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminDashboardData,
  logoutUser,
  DashboardData,
} from "../services/authService";

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    getAdminDashboardData()
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
    if (!data) return <p>Loading admin data...</p>;
    return (
      <div className="user-info">
        <div className="avatar avatar-admin">
          {String(data.user.name)?.[0]?.toUpperCase()}
        </div>
        <h3>Hello, {data.user.name}!</h3>
        <p className="text-muted">{data.user.email}</p>
        <p className="badge">{data.message}</p>

        <div
          style={{
            margin: "1.5rem 0",
            padding: "1rem",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem 0" }}>Leave Quota</h4>
          <p
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: "#28a745",
            }}
          >
            Unlimited (Admin)
          </p>
        </div>

        <button
          onClick={() => navigate("/leave-management")}
          className="leave-btn"
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "1rem",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Go to Leave Management
        </button>

        <div className="permissions-box">
          <h4>Permissions</h4>
          <ul>
            {data.stats.permissions.map((p) => (
              <li key={p} className="permission-item">
                {"\u2713"} {p.split("_").join(" ")}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card role-admin">
        <div className="role-badge admin-badge">ADMIN</div>
        <h2>Admin Dashboard</h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;

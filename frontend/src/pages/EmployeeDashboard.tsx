import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEmployeeDashboardData,
  logoutUser,
  DashboardData,
} from "../services/authService";

const EmployeeDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    getEmployeeDashboardData()
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
    if (!data) return <p>Loading your data...</p>;
    return (
      <div className="user-info">
        <div className="avatar avatar-employee">
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
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card role-employee">
        <div className="role-badge employee-badge">EMPLOYEE</div>
        <h2>Dashboard</h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDashboardData,
  logoutUser,
  UserData,
} from "../services/authService";

const Dashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getDashboardData();
        setUserData(user);
      } catch (_err) {
        setError("Unauthorized access. Please login again.");
        setTimeout(() => navigate("/"), 3000);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h2>Dashboard</h2>
        {error ? (
          <p className="error-text">{error}</p>
        ) : userData ? (
          <div className="user-info">
            <div className="avatar">
              {String(userData.name)?.[0]?.toUpperCase()}
            </div>
            <h3>Hello, {String(userData.name)}!</h3>
            <p>Email: {String(userData.email)}</p>
            <p className="badge">Secured via JWT &amp; HttpOnly Cookies</p>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <p>Loading your secure data...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

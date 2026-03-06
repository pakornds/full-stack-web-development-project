import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardData, logoutUser } from '../services/authService';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getDashboardData();
        setUserData(user);
      } catch (err) {
        setError('Unauthorized access. Please login again.');
        setTimeout(() => navigate('/'), 3000);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
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
             <div className="avatar">{userData.name?.[0]?.toUpperCase()}</div>
             <h3>Hello, {userData.name}!</h3>
             <p>Email: {userData.email}</p>
             <p className="badge">Secured via JWT & HttpOnly Cookies</p>
             <button onClick={handleLogout} className="logout-btn">Logout</button>
           </div>
        ) : (
          <p>Loading your secure data...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardData } from "../services/authService";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectByRole = async () => {
      try {
        const user = await getDashboardData();
        const role = user.role;
        if (role === "admin") navigate("/dashboard/admin", { replace: true });
        else if (role === "manager") navigate("/dashboard/manager", { replace: true });
        else navigate("/dashboard/employee", { replace: true });
      } catch {
        navigate("/login", { replace: true });
      }
    };
    redirectByRole();
  }, [navigate]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <p>Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default Dashboard;

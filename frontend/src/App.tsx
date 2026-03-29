import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";

import TwoFactorSetup from "./pages/TwoFactorSetup";
import PersonalLeaveDashboard from "./pages/PersonalLeaveDashboard";
import DepartmentLeaveDashboard from "./pages/DepartmentLeaveDashboard";
import LogLeaveDashboard from "./pages/LogLeaveDashboard";

function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/settings/2fa" element={<TwoFactorSetup />} />
        {/* Leave Management */}
        <Route path="/dashboard/personal" element={<PersonalLeaveDashboard />} />
        <Route path="/dashboard/personal/:userId" element={<PersonalLeaveDashboard />} />
        <Route path="/dashboard/department" element={<DepartmentLeaveDashboard />} />
        <Route path="/dashboard/logs" element={<LogLeaveDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

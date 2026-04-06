import React, { useEffect, useState } from "react";
import LeaveLayout from "../components/LeaveLayout";
import { useNavigate } from "react-router-dom";
import {
  getDepartmentLeave,
  DepartmentLeaveData,
  updateUserRole,
  updateUserDepartment,
} from "../services/leaveService";
import { getDashboardData } from "../services/authService";

const DepartmentLeaveDashboard: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentLeaveData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userDept, setUserDept] = useState("");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [deptData, userData] = await Promise.all([
          getDepartmentLeave(),
          getDashboardData(),
        ]);
        setDepartments(deptData);
        setUserRole(userData.role || "");
        setUserDept(userData.department?.name || "");
        if (deptData.length > 0) {
          setExpandedDept(deptData[0].id);
        }
      } catch {
        setError("Access denied or session expired.");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const handleRoleUpdate = async (memberId: string, newRole: string) => {
    try {
      if (!globalThis.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
      await updateUserRole(memberId, newRole);
      const deptData = await getDepartmentLeave();
      setDepartments(deptData);
    } catch (err: unknown) {
      console.error(err);
      alert("Failed to update user role.");
    }
  };

  const handleDeptUpdate = async (memberId: string, newDeptId: string) => {
    try {
      if (!globalThis.confirm(`Are you sure you want to change this user's department?`)) return;
      await updateUserDepartment(memberId, newDeptId);
      const deptData = await getDepartmentLeave();
      setDepartments(deptData);
    } catch (err: unknown) {
      console.error(err);
      alert("Failed to update user department.");
    }
  };

  // Dynamically collect all unique leave types across the entire organization to use as headers
  const allLeaveTypes = new Set<string>();
  departments.forEach(dept => {
    dept.members.forEach(m => {
      m.quotas.forEach(q => allLeaveTypes.add(q.leaveType));
    });
  });
  const leaveTypeHeaders = Array.from(allLeaveTypes).sort((a, b) => a.localeCompare(b));


  const filteredDepartments = departments
    .map((dept) => ({
      ...dept,
      members: dept.members.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((dept) =>
      searchTerm
        ? dept.members.length > 0
        : true
    );

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner" />
          <p>Loading department data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leave-page">
        <div className="leave-error-card">
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <LeaveLayout userRole={userRole} departmentName={userDept}>

      {/* Main Content */}
      <main className="leave-main">
        <header className="leave-header">
          <div className="header-left">
            <div>
              <h1 id="department-leave-title">Department Leave Overview</h1>
              <p className="header-subtitle">
                Monitor leave usage across all departments
              </p>
            </div>            <button
                className="primary-action-btn"
                onClick={() => navigate("/leave-management")}
                style={{ marginLeft: "1rem" }}
              >
                Go to Leave Management
            </button>          </div>
          <div className="search-box">
            <input
              type="text"
              id="dept-search"
                placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Department Summary Cards */}
        <section className="dept-summary-section">
          <div className="dept-summary-grid">
            {departments.map((dept) => {
              const usagePercent =
                dept.totalQuota > 0
                  ? Math.round((dept.totalUsed / dept.totalQuota) * 100)
                  : 0;
              return (
                <button
                  key={dept.id}
                  type="button"
                  className={`dept-summary-card ${expandedDept === dept.id ? "active" : ""}`}
                  onClick={() =>
                    setExpandedDept(
                      expandedDept === dept.id ? null : dept.id
                    )
                  }
                >
                  <div className="dept-summary-header">
                    <h3>{dept.name}</h3>
                    <span className="member-count">
                      {dept.members.length} members
                    </span>
                  </div>
                  <div className="dept-usage">
                    <div className="usage-ring">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <path
                          className="circle-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="circle-fill"
                          strokeDasharray={`${usagePercent}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          style={{
                            stroke: (() => {
                              if (usagePercent > 80) return "#ef4444";
                              if (usagePercent > 50) return "#f59e0b";
                              return "#10b981";
                            })(),
                          }}
                        />
                        <text x="18" y="20.35" className="percentage-text">
                          {usagePercent}%
                        </text>
                      </svg>
                    </div>
                    <div className="usage-numbers">
                      <span>
                        Used: <strong>{dept.totalUsed}</strong>
                      </span>
                      <span>
                        Total: <strong>{dept.totalQuota}</strong>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Department Members Table */}
        {expandedDept && (
          <section className="dept-members-section slide-down">
            <h2 className="section-title">
              {departments.find((d) => d.id === expandedDept)?.name} — Members
            </h2>
            <div className="table-wrapper">
              <table className="leave-table" id="department-members-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th>Role</th>
                    {leaveTypeHeaders.map((type) => (
                      <th key={type}>{type}</th>
                    ))}
                    <th>Total Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    filteredDepartments.find((d) => d.id === expandedDept)
                      ?.members || []
                  ).map((member) => (
                    <tr key={member.id}>
                      <td>
                        <button
                          className="member-name-link"
                          onClick={() =>
                            navigate(`/dashboard/personal/${member.id}`)
                          }
                        >
                          <span className="mini-avatar">
                            {member.name[0]?.toUpperCase()}
                          </span>
                          {member.name}
                        </button>
                      </td>
                      <td>
                        {userRole === "admin" || userRole === "manager" ? (
                          <select
                            className="role-select dept-tag"
                            value={expandedDept || 'unassigned'}
                            onChange={(e) => handleDeptUpdate(member.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: "transparent", border: "1px solid var(--border-color)", padding: "0.25rem", borderRadius: "0.5rem", color: "var(--text-main)" }}
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="dept-tag">
                            {departments.find(d => d.id === expandedDept)?.name || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="email-cell">{member.email}</td>
                      <td>
                        {userRole === "admin" ? (
                          <select
                            className={`role-select role-tag role-tag-${member.role}`}
                            value={member.role}
                            onChange={(e) => handleRoleUpdate(member.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`role-tag role-tag-${member.role}`}>
                            {member.role}
                          </span>
                        )}
                      </td>
                      {leaveTypeHeaders.map((type) => {
                        const q = member.quotas.find(q => q.leaveType === type);
                        return (
                          <td key={type} className="quota-cell">
                            {q ? (
                              <>
                                <span className="used-count">{q.usedDays}</span>
                                <span className="quota-separator">/</span>
                                <span className="total-count">{q.totalDays}</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <strong>{member.totalUsed}</strong>
                        <span className="text-muted">
                          {" "}
                          / {member.totalQuota}
                        </span>
                      </td>
                      <td>
                        <button
                          className="view-detail-btn"
                          onClick={() =>
                            navigate(`/dashboard/personal/${member.id}`)
                          }
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </LeaveLayout>
  );
};

export default DepartmentLeaveDashboard;

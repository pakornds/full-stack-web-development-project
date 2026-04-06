import React, { useEffect, useState } from "react";
import LeaveLayout from "../components/LeaveLayout";
import { getAuditLogs, AuditLog } from "../services/auditService";
import { getDashboardData } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../utils/formatters";

const SystemLogsDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userDept, setUserDept] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const userData = await getDashboardData();
        if (userData.role !== 'admin') {
          navigate("/dashboard/personal");
          return;
        }
        setUserRole(userData.role);
        setUserDept(userData.department?.name || "");

        const data = await getAuditLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [navigate]);

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner" />
          <p>Loading system audit logs...</p>
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
      <main className="leave-main">
        <header className="leave-header">
          <div>
            <h1 id="sys-log-title">System Audit Logs</h1>
            <p className="header-subtitle">Trail of all administrative and user activities</p>
          </div>
        </header>

        <section className="logs-table-section">
          {logs.length === 0 ? (
            <div className="empty-state">
              <p>No audit logs available.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ensures each row has a stable, unique key */}
                  {logs.map((log) => (
                    <tr key={log.timestamp + log.userEmail + log.action + log.resource}>
                      <td className="date-cell">{formatDateTime(log.timestamp)}</td>
                      <td>{log.userEmail}</td>
                      <td><span className="type-badge">{log.action}</span></td>
                      <td>{log.resource}</td>
                      <td>
                        {log.details ? (
                          <pre style={{ fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </LeaveLayout>
  );
};

export default SystemLogsDashboard;

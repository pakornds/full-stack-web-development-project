import React, { useEffect, useState } from "react";
import LeaveLayout from "../components/LeaveLayout";
import { useNavigate } from "react-router-dom";
import {
  getLeaveLogs,
  getLeaveLogDetail,
  updateLeaveStatus,
  LeaveLogItem,
  LeaveLogDetail,
} from "../services/leaveService";
import { getDashboardData } from "../services/authService";
import { formatDate, formatDateTime, getStatusClass } from "../utils/formatters";

const LogLeaveDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LeaveLogItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userDept, setUserDept] = useState("");
  const [selectedLog, setSelectedLog] = useState<LeaveLogDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const loadLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const [data, userData] = await Promise.all([
        getLeaveLogs(),
        getDashboardData(),
      ]);
      setLogs(data);
      setUserRole(userData.role || "");
      setUserDept(userData.department?.name || "");
    } catch {
      setError("Access denied or session expired.");
      setTimeout(() => navigate("/login"), 2000);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  const handleViewDetail = async (id: string) => {
    try {
      const detail = await getLeaveLogDetail(id);
      setSelectedLog(detail);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to load log detail", err);
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateLeaveStatus(requestId, status);
      setShowModal(false);
      setSelectedLog(null);
      await loadLogs();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };


  // Get unique departments for filter
  const uniqueDepts = [
    ...new Set(logs.map((l) => l.requester.department)),
  ].sort((a, b) => a.localeCompare(b));

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    const statusMatch =
      filterStatus === "all" || log.status.toLowerCase() === filterStatus;
    const deptMatch =
      filterDept === "all" || log.requester.department === filterDept;
    const searchMatch =
      !searchTerm ||
      log.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.requester.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && deptMatch && searchMatch;
  });

  // Stats
    const pendingCount = logs.filter((l) => l.status.toLowerCase() === "pending").length;
    const approvedCount = logs.filter((l) => l.status.toLowerCase() === "approved").length;
    const rejectedCount = logs.filter((l) => l.status.toLowerCase() === "rejected").length;
  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner" />
          <p>Loading leave logs...</p>
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
              <h1 id="log-leave-title">Leave Request Logs</h1>
              <p className="header-subtitle">
                Complete audit trail of all leave requests
              </p>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="log-stats-section">
          <div className="log-stats-grid">
            <div className="log-stat-card stat-total">
              <span className="stat-number">{logs.length}</span>
              <span className="stat-label">Total Requests</span>
            </div>
            <div className="log-stat-card stat-pending">
              <span className="stat-number">{pendingCount}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="log-stat-card stat-approved">
              <span className="stat-number">{approvedCount}</span>
              <span className="stat-label">Approved</span>
            </div>
            <div className="log-stat-card stat-rejected">
              <span className="stat-number">{rejectedCount}</span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="log-filters">
          <div className="filter-row">
            <div className="search-box">
              <input
                type="text"
                id="log-search"
                placeholder="Search by name, email, or leave type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              id="filter-status"
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              id="filter-dept"
              className="filter-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {uniqueDepts.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Logs Table */}
        <section className="logs-table-section">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", display: "block", marginBottom: "12px", color: "var(--text-muted)" }}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <p>No matching leave requests found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="leave-table" id="leave-logs-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Leave Date</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="log-row clickable"
                      onClick={() => handleViewDetail(log.id)}
                    >
                      <td>
                        <div className="requester-cell">
                          <span className="mini-avatar">
                            {log.requester.name[0]?.toUpperCase()}
                          </span>
                          <div>
                            <div className="requester-name">
                              {log.requester.name}
                            </div>
                            <div className="requester-email">
                              {log.requester.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dept-tag">
                          {log.requester.department}
                        </span>
                      </td>
                      <td>
                        <span className="type-badge">{log.leaveType}</span>
                      </td>
                      <td className="date-cell">
                        {formatDate(log.startDate)} — {formatDate(log.endDate)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(log.status)}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td>{log.approver?.name || "—"}</td>
                      <td className="date-cell">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td>
                        <button
                          className="view-detail-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(log.id);
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Detail Modal */}
      {showModal && selectedLog && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Close modal"
            onClick={() => setShowModal(false)}
          />
          <dialog
            className="modal-content slide-down"
            open
          >
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            <h2>Leave Request Detail</h2>

            <div className="modal-detail-grid">
              <div className="detail-section">
                <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Requester</h4>
                <div className="detail-row">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">
                    {selectedLog.requester.name}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">
                    {selectedLog.requester.email}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">
                    {selectedLog.requester.department}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">
                    {selectedLog.requester.role}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Leave Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value type-badge">
                    {selectedLog.leaveType}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">
                    {formatDate(selectedLog.startDate)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">End Date</span>
                  <span className="detail-value">
                    {formatDate(selectedLog.endDate)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Days</span>
                  <span className="detail-value">
                    {selectedLog.totalDays} day(s)
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reason</span>
                  <span className="detail-value">
                    {selectedLog.reason || "No reason provided"}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>Status</h4>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span
                    className={`status-badge ${getStatusClass(selectedLog.status)}`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
                {selectedLog.approver && (
                  <div className="detail-row">
                    <span className="detail-label">Approved/Rejected By</span>
                    <span className="detail-value">
                      {selectedLog.approver.name}
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Submitted At</span>
                  <span className="detail-value">
                    {formatDateTime(selectedLog.createdAt)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">
                    {formatDateTime(selectedLog.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {selectedLog.status.toLowerCase() === "pending" && (
              <div className="modal-actions">
                <button
                  className="approve-btn"
                  onClick={() =>
                    handleStatusUpdate(selectedLog.id, "approved")
                  }
                >
                  ✓ Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() =>
                    handleStatusUpdate(selectedLog.id, "rejected")
                  }
                >
                  ✕ Reject
                </button>
              </div>
            )}
          </dialog>
        </>
      )}
    </LeaveLayout>
  );
};

export default LogLeaveDashboard;

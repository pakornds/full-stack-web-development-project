import React, { useEffect, useState } from "react";
import LeaveLayout from "../components/LeaveLayout";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPersonalLeave,
  getPersonalLeaveForUser,
  getLeaveTypes,
  createLeaveRequest,
  PersonalLeaveData,
  LeaveType,
} from "../services/leaveService";
import { formatDate, getStatusClass } from "../utils/formatters";


const PersonalLeaveDashboard: React.FC = () => {
  const [data, setData] = useState<PersonalLeaveData | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const isViewingOther = !!userId;

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [leaveData, types] = await Promise.all([
        userId ? getPersonalLeaveForUser(userId) : getPersonalLeave(),
        getLeaveTypes(),
      ]);
      setData(leaveData);
      setLeaveTypes(types);
      if (types.length > 0 && !requestForm.leaveTypeId) {
        setRequestForm((prev) => ({ ...prev, leaveTypeId: types[0].id }));
      }
    } catch {
      setError("Access denied or session expired.");
      setTimeout(() => navigate("/login"), 2000);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate, requestForm.leaveTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    setRequestSuccess("");
    setSubmitting(true);

    try {
      await createLeaveRequest(requestForm);
      setRequestSuccess("Leave request submitted successfully!");
      setShowRequestForm(false);
      setRequestForm({
        leaveTypeId: leaveTypes[0]?.id || "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setRequestError(
        axiosErr.response?.data?.message || "Failed to submit leave request"
      );
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner" />
          <p>Loading your leave data...</p>
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

  if (!data) return null;

  return (
    <LeaveLayout userRole={data.user.role}>

      {/* Main Content */}
      <main className="leave-main">
        {/* Header */}
        <header className="leave-header">
          <div className="header-left">
            {isViewingOther && (
              <button
                className="back-btn"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
            )}
            <div>
              <h1 id="personal-leave-title">
                {isViewingOther
                  ? `${data.user.name}'s Leave`
                  : "My Leave Dashboard"}
              </h1>
              <p className="header-subtitle">
                {data.user.department?.name || "No Department"} •{" "}
                {data.user.email}
              </p>
            </div>
          </div>
          {!isViewingOther && (
            <button
              id="request-leave-btn"
              className="primary-action-btn"
              onClick={() => setShowRequestForm(!showRequestForm)}
            >
              {showRequestForm ? "✕ Cancel" : "＋ Request Leave"}
            </button>
          )}
        </header>

        {/* Request Form */}
        {showRequestForm && (
          <div className="leave-request-form-card slide-down">
            <h3>📝 New Leave Request</h3>
            {requestError && (
              <div className="form-error">{requestError}</div>
            )}
            {requestSuccess && (
              <div className="form-success">{requestSuccess}</div>
            )}
            <form onSubmit={handleSubmitRequest} className="request-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="leaveType">Leave Type</label>
                  <select
                    id="leaveType"
                    value={requestForm.leaveTypeId}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        leaveTypeId: e.target.value,
                      })
                    }
                    required
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={requestForm.startDate}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        startDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    id="endDate"
                    type="date"
                    value={requestForm.endDate}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        endDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="reason">Reason</label>
                <textarea
                  id="reason"
                  placeholder="Enter your reason for leave..."
                  value={requestForm.reason}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      reason: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="primary-action-btn"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* Quota Cards */}
        <section className="quota-section">
          <h2 className="section-title">Leave Balance</h2>
          <div className="quota-grid">
            {data.quotas.map((q) => {
              const percentage =
                q.totalDays > 0
                  ? Math.round((q.usedDays / q.totalDays) * 100)
                  : 0;
              return (
                <div key={q.id} className="quota-card">
                  <div className="quota-header">
                    <span className="quota-type">{q.leaveType}</span>
                    <span className="quota-year">{q.year}</span>
                  </div>
                  <div className="quota-numbers">
                    <div className="quota-main-number">
                      <span className="big-number">{q.remainingDays}</span>
                      <span className="number-label">days left</span>
                    </div>
                    <div className="quota-details">
                      <span>
                        Used: <strong>{q.usedDays}</strong>
                      </span>
                      <span>
                        Total: <strong>{q.totalDays}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="quota-bar-bg">
                    <div
                      className="quota-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        background:
                          percentage > 80
                            ? "linear-gradient(90deg, #ef4444, #f87171)"
                            : percentage > 50
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : "linear-gradient(90deg, #10b981, #34d399)",
                      }}
                    />
                  </div>
                  <span className="quota-percentage">{percentage}% used</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leave History */}
        <section className="history-section">
          <h2 className="section-title">Leave History</h2>
          {data.leaveHistory.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No leave requests yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="leave-table" id="leave-history-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaveHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="type-badge">{item.leaveType}</span>
                      </td>
                      <td>{formatDate(item.startDate)}</td>
                      <td>{formatDate(item.endDate)}</td>
                      <td className="reason-cell">
                        {item.reason || "—"}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.approver || "—"}</td>
                      <td className="date-cell">
                        {formatDate(item.createdAt)}
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

export default PersonalLeaveDashboard;

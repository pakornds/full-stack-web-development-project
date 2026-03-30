import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import sanitizeHtml from "sanitize-html";
import { getDashboardData, UserData } from "../services/authService";
import {
  getLeaves,
  getLeaveTypes,
  createLeave,
  updateLeave,
  deleteLeave,
  updateLeaveStatus,
  LeaveRequest,
  LeaveType,
  CreateLeaveDto,
} from "../services/leaveService";
import { useNavigate } from "react-router-dom";
import LeaveLayout from "../components/LeaveLayout";
import { formatDate, getStatusClass } from "../utils/formatters";

const LeaveManagement: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [userDept, setUserDept] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeaveDto>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userData, leavesData, typesData] = await Promise.all([
        getDashboardData(),
        getLeaves(),
        getLeaveTypes(),
      ]);
      setUser(userData);
      setUserDept(userData.department?.name || "");
      setLeaves(leavesData);
      setLeaveTypes(typesData);
    } catch {
      toast.error("Failed to load data. Please log in again.");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateLeaveDto) => {
    // Sanitize reason frontend-side as an extra precaution
    const sanitizedData = {
      ...data,
      reason: sanitizeHtml(data.reason, {
        allowedTags: [],
        allowedAttributes: {},
      }),
    };

    try {
      if (editingLeave) {
        await updateLeave(editingLeave.id, sanitizedData);
        toast.success("Leave request updated successfully");
      } else {
        await createLeave(sanitizedData);
        toast.success("Leave request submitted successfully");
      }
      setIsFormVisible(false);
      setEditingLeave(null);
      reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to process request");
    }
  };

  const handleEdit = (leave: LeaveRequest) => {
    if (leave.status !== "Pending") {
      toast.error("Can only edit Pending requests");
      return;
    }
    setEditingLeave(leave);
    setIsFormVisible(true);
    reset({
      startDate: leave.startDate.substring(0, 10),
      endDate: leave.endDate.substring(0, 10),
      leaveType: leave.leaveTypeId,
      reason: leave.reason,
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this leave request?")) {
      try {
        await deleteLeave(id);
        toast.success("Leave request deleted");
        fetchData();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to delete request",
        );
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateLeaveStatus(id, status);
      toast.success(`Request ${status.toLowerCase()}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner" />
          <p>Loading leave management details...</p>
        </div>
      </div>
    );
  }

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  return (
    <LeaveLayout userRole={user?.role || "employee"} departmentName={userDept}>
      <main className="leave-main">
        <header className="leave-header">
          <div className="header-left">
            <div>
              <h1 id="leave-management-title">Leave Management</h1>
              <p className="header-subtitle">
                Manage and track leave requests.
              </p>
            </div>
          </div>
          <div className="header-right">
            {!isFormVisible && (
              <button
                className="primary-action-btn"
                onClick={() => setIsFormVisible(true)}
              >
                + New Request
              </button>
            )}
          </div>
        </header>

        {isFormVisible && (
          <section className="quota-section">
            <h2 className="section-title">
              {editingLeave ? "Edit Leave Request" : "New Leave Request"}
            </h2>
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                marginBottom: "24px",
                width: "100%",
              }}
            >
              <form
                className="register-form"
                onSubmit={handleSubmit(onSubmit)}
                style={{ marginBottom: 0 }}
              >
                <div style={{ display: "flex", gap: "15px" }}>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--text-main)",
                      }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      {...register("startDate", {
                        required: "Start date is required",
                      })}
                    />
                    {errors.startDate && (
                      <span className="error-text" style={{ fontSize: "12px" }}>
                        {errors.startDate.message}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--text-main)",
                      }}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      {...register("endDate", {
                        required: "End date is required",
                      })}
                    />
                    {errors.endDate && (
                      <span className="error-text" style={{ fontSize: "12px" }}>
                        {errors.endDate.message}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--text-main)",
                    }}
                  >
                    Leave Type
                  </label>
                  <select
                    {...register("leaveType", {
                      required: "Leave type is required",
                    })}
                    style={{
                      padding: "12px 15px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  >
                    <option value="">Select type...</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {errors.leaveType && (
                    <span className="error-text" style={{ fontSize: "12px" }}>
                      {errors.leaveType.message}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--text-main)",
                    }}
                  >
                    Reason
                  </label>
                  <textarea
                    {...register("reason", { required: "Reason is required" })}
                    style={{
                      padding: "12px 15px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      minHeight: "100px",
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    placeholder="Provide a reason for your leave request..."
                  ></textarea>
                  {errors.reason && (
                    <span className="error-text" style={{ fontSize: "12px" }}>
                      {errors.reason.message}
                    </span>
                  )}
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "10px" }}
                >
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : editingLeave
                        ? "Update Request"
                        : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => {
                      setIsFormVisible(false);
                      setEditingLeave(null);
                      reset();
                    }}
                    style={{ flex: 1, background: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        <section className="quota-section">
          <h2 className="section-title">Leave Requests</h2>
          <div className="table-wrapper">
            {leaves.length === 0 ? (
              <p
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No leave requests found.
              </p>
            ) : (
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Dates</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.user?.name || user?.name}</td>
                      <td>
                        {formatDate(leave.startDate)} -{" "}
                        {formatDate(leave.endDate)}
                      </td>
                      <td>{leave.leaveType?.name}</td>
                      <td>{leave.reason}</td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(leave.status.toLowerCase())}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {leave.approvedBy ? leave.approvedBy.name : "-"}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          {leave.status === "Pending" &&
                            (user?.role === "employee" ||
                              (isManagerOrAdmin &&
                                leave.user?.email === user?.email)) && (
                              <>
                                <button
                                  onClick={() => handleEdit(leave)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "none",
                                    border: "1px solid var(--primary)",
                                    color: "var(--primary)",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(leave.id)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "none",
                                    border: "1px solid var(--danger)",
                                    color: "var(--danger)",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          {isManagerOrAdmin && leave.status === "Pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(leave.id, "Approved")
                                }
                                style={{
                                  padding: "6px 12px",
                                  background: "var(--success)",
                                  border: "1px solid var(--success)",
                                  color: "white",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(leave.id, "Rejected")
                                }
                                style={{
                                  padding: "6px 12px",
                                  background: "var(--text-main)",
                                  border: "1px solid var(--text-main)",
                                  color: "white",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </LeaveLayout>
  );
};

export default LeaveManagement;

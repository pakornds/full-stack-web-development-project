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
    } catch (error) {
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

  const renderForm = () => (
    <div
      className="leave-form-container"
      style={{
        marginBottom: "2rem",
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3>{editingLeave ? "Edit Leave Request" : "New Leave Request"}</h3>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label>Start Date</label>
            <input
              type="date"
              {...register("startDate", { required: "Start date is required" })}
              style={{ width: "100%", padding: "0.5rem" }}
            />
            {errors.startDate && (
              <span style={{ color: "red", fontSize: "0.8rem" }}>
                {errors.startDate.message}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label>End Date</label>
            <input
              type="date"
              {...register("endDate", { required: "End date is required" })}
              style={{ width: "100%", padding: "0.5rem" }}
            />
            {errors.endDate && (
              <span style={{ color: "red", fontSize: "0.8rem" }}>
                {errors.endDate.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label>Leave Type</label>
          <select
            {...register("leaveType", { required: "Leave type is required" })}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Select type...</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {errors.leaveType && (
            <span style={{ color: "red", fontSize: "0.8rem" }}>
              {errors.leaveType.message}
            </span>
          )}
        </div>

        <div>
          <label>Reason</label>
          <textarea
            {...register("reason", { required: "Reason is required" })}
            style={{ width: "100%", padding: "0.5rem", minHeight: "100px" }}
            placeholder="Please enter your reason and time..."
          ></textarea>
          {errors.reason && (
            <span style={{ color: "red", fontSize: "0.8rem" }}>
              {errors.reason.message}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.5rem 1rem",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isSubmitting
              ? "Submitting..."
              : editingLeave
                ? "Update Request"
                : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFormVisible(false);
              setEditingLeave(null);
              reset();
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
    );
  }

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "2rem",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            width: "100%",
          }}
        >
          <h2 style={{ margin: 0, textAlign: "left" }}>Leave Management</h2>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => navigate("/dashboard/personal")}
              style={{
                padding: "0.5rem 1rem",
                background: "#f8f9fa",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Back to Dashboard
            </button>
            {!isFormVisible && (
              <button
                onClick={() => setIsFormVisible(true)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + New Request
              </button>
            )}
          </div>
        </div>
        {isFormVisible && renderForm()}
        {/* Table Section */}
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
            flex: 1,
          }}
        >
          {leaves.length === 0 ? (
            <p
              style={{
                padding: "2rem",
                textAlign: "center",
                margin: 0,
                color: "#6c757d",
              }}
            >
              No leave requests found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "100%",
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Dates
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Reason
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Action By
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr
                    key={leave.id}
                    style={{ borderBottom: "1px solid #dee2e6" }}
                  >
                    <td style={{ padding: "1rem" }}>
                      {leave.user?.name || user?.name}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {new Date(leave.startDate).toLocaleDateString()} -{" "}
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1rem" }}>{leave.leaveType?.name}</td>
                    <td style={{ padding: "1rem" }}>{leave.reason}</td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "12px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          background:
                            leave.status === "Pending"
                              ? "#ffc107"
                              : leave.status === "Approved"
                                ? "#28a745"
                                : "#dc3545",
                          color:
                            leave.status === "Pending" ? "#212529" : "white",
                        }}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {leave.approvedBy ? leave.approvedBy.name : "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {leave.status === "Pending" &&
                          (user?.role === "employee" || isManagerOrAdmin) && (
                            <>
                              <button
                                onClick={() => handleEdit(leave)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#ffc107",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(leave.id)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
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
                                padding: "0.25rem 0.5rem",
                                background: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(leave.id, "Rejected")
                              }
                              style={{
                                padding: "0.25rem 0.5rem",
                                background: "#343a40",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
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
      </div>
    </div>
  );
};

export default LeaveManagement;

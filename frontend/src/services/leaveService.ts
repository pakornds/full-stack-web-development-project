import api from "../axios";

// ─── Types ──────────────────────────────────────────────────

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
}

export interface LeaveQuota {
  id: string;
  leaveType: string;
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

export interface LeaveHistoryItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approver: string | null;
  createdAt: string;
}

export interface PersonalLeaveData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: { id: string; name: string } | null;
  };
  quotas: LeaveQuota[];
  leaveHistory: LeaveHistoryItem[];
}

export interface DepartmentMember {
  id: string;
  name: string;
  email: string;
  role: string;
  quotas: {
    leaveType: string;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  }[];
  totalUsed: number;
  totalQuota: number;
}

export interface DepartmentLeaveData {
  id: string;
  name: string;
  members: DepartmentMember[];
  totalUsed: number;
  totalQuota: number;
}

export interface LeaveLogItem {
  id: string;
  requester: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approver: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveLogDetail extends LeaveLogItem {
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  };
  totalDays: number;
  approver: { id: string; name: string; email: string } | null;
}

// ─── API Calls ──────────────────────────────────────────────

export const getLeaveTypes = async (): Promise<LeaveType[]> => {
  const response = await api.get<LeaveType[]>("/dashboard/types");
  return response.data;
};

export const getPersonalLeave = async (): Promise<PersonalLeaveData> => {
  const response = await api.get<PersonalLeaveData>("/dashboard/personal");
  return response.data;
};

export const getPersonalLeaveForUser = async (
  userId: string,
): Promise<PersonalLeaveData> => {
  const response = await api.get<PersonalLeaveData>(
    `/dashboard/personal/${userId}`,
  );
  return response.data;
};

export const getDepartmentLeave = async (): Promise<DepartmentLeaveData[]> => {
  const response = await api.get<DepartmentLeaveData[]>(
    "/dashboard/department",
  );
  return response.data;
};

export const getLeaveLogs = async (): Promise<LeaveLogItem[]> => {
  const response = await api.get<LeaveLogItem[]>("/dashboard/logs");
  return response.data;
};

export const getLeaveLogDetail = async (
  id: string,
): Promise<LeaveLogDetail> => {
  const response = await api.get<LeaveLogDetail>(`/dashboard/logs/${id}`);
  return response.data;
};

export const updateUserRole = async (
  userId: string,
  role: string,
): Promise<unknown> => {
  const response = await api.patch(`/dashboard/users/${userId}/role`, { role });
  return response.data;
};

export const updateUserDepartment = async (
  userId: string,
  departmentId: string | null,
): Promise<unknown> => {
  const response = await api.patch(`/dashboard/users/${userId}/department`, {
    departmentId,
  });
  return response.data;
};

// ─── Leaves Management ─────────────────────────────

export interface LeaveRequest {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  leaveTypeId: string;
  leaveType: {
    id: string;
    name: string;
    defaultDays: number;
  };
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: {
    name: string;
    email: string;
  };
}

export interface CreateLeaveDto {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}

export interface UpdateLeaveDto {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}

export const getLeaves = async (): Promise<LeaveRequest[]> => {
  const response = await api.get<LeaveRequest[]>("/leaves");
  return response.data;
};

export const createLeave = async (
  data: CreateLeaveDto,
): Promise<LeaveRequest> => {
  const response = await api.post<LeaveRequest>("/leaves", data);
  return response.data;
};

export const updateLeave = async (
  id: string,
  data: UpdateLeaveDto,
): Promise<LeaveRequest> => {
  const response = await api.put<LeaveRequest>(`/leaves/${id}`, data);
  return response.data;
};

export const deleteLeave = async (id: string): Promise<void> => {
  const response = await api.delete(`/leaves/${id}`);
  return response.data;
};

export const updateLeaveStatus = async (
  id: string,
  status: string,
): Promise<LeaveRequest> => {
  const response = await api.patch<LeaveRequest>(`/leaves/${id}/status`, {
    status,
  });
  return response.data;
};

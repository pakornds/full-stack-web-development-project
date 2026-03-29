import api from "../axios";

export interface LeaveRequest {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  leaveType: string;
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

export const createLeave = async (data: CreateLeaveDto): Promise<LeaveRequest> => {
  const response = await api.post<LeaveRequest>("/leaves", data);
  return response.data;
};

export const updateLeave = async (id: string, data: UpdateLeaveDto): Promise<LeaveRequest> => {
  const response = await api.put<LeaveRequest>(`/leaves/${id}`, data);
  return response.data;
};

export const deleteLeave = async (id: string): Promise<void> => {
  const response = await api.delete(`/leaves/${id}`);
  return response.data;
};

export const updateLeaveStatus = async (id: string, status: string): Promise<LeaveRequest> => {
  const response = await api.patch<LeaveRequest>(`/leaves/${id}/status`, { status });
  return response.data;
};

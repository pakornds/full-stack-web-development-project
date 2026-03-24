import api from "../axios";

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export interface UserData {
  name: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface DashboardData {
  user: UserData;
  stats: {
    description?: string;
    permissions: string[];
    apiUptime?: string;
    nodeVersion?: string;
    environment?: string;
  };
  message: string;
}

export const loginUser = async (formData: LoginFormData): Promise<UserData> => {
  const response = await api.post<UserData>("/auth/login", formData);
  return response.data;
};

export const loginWithGoogle = () => {
  window.location.href = "http://localhost:3000/auth/google";
  return Promise.resolve({} as UserData);
};

export const registerUser = async (
  formData: RegisterFormData,
): Promise<UserData> => {
  const response = await api.post<UserData>("/auth/register", formData);
  return response.data;
};

export const registerWithGoogle = loginWithGoogle;

export const getDashboardData = async (): Promise<UserData> => {
  const response = await api.get<{ user: UserData }>("/auth/me");
  return response.data.user;
};

export const getAdminDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>("/auth/dashboard/admin");
  return response.data;
};

export const getManagerDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>("/auth/dashboard/manager");
  return response.data;
};

export const getEmployeeDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>("/auth/dashboard/employee");
  return response.data;
};

export const logoutUser = async (): Promise<unknown> => {
  const response = await api.get("/auth/logout");
  return response.data;
};

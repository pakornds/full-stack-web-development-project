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
  twoFactorEnabled?: boolean;
  department?: { id: string; name: string };
  [key: string]: any;
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

export interface LoginResponse {
  requiresTwoFactor?: boolean;
  tempToken?: string;
  user?: UserData;
  message?: string;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export const loginUser = async (
  formData: LoginFormData,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/auth/login", formData);
  return response.data;
};

export const verifyTwoFactorLogin = async (
  tempToken: string,
  code: string,
): Promise<UserData> => {
  const response = await api.post<{ user: UserData }>("/auth/2fa/verify-login", {
    tempToken,
    code,
  });
  return response.data.user;
};

export const generateTwoFactorSecret =
  async (): Promise<TwoFactorSetupData> => {
    const response = await api.post<TwoFactorSetupData>("/auth/2fa/generate");
    return response.data;
  };

export const enableTwoFactor = async (
  code: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/auth/2fa/enable", {
    code,
  });
  return response.data;
};

export const disableTwoFactor = async (
  code: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/auth/2fa/disable", {
    code,
  });
  return response.data;
};

export const loginWithGoogle = () => {
  globalThis.location.href = "http://localhost:3000/auth/google";
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

export const getHrDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>("/auth/dashboard/hr");
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

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/auth/reset-password", { token, newPassword });
  return response.data;
};

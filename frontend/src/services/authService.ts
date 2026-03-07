import api from "../axios";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export interface UserData {
  name: string;
  email: string;
  [key: string]: unknown;
}

export const registerUser = async (
  formData: RegisterFormData,
): Promise<UserData> => {
  const response = await api.post<UserData>("/auth/register", formData);
  return response.data;
};

export const registerWithGoogle = async (): Promise<UserData> => {
  const authData = await pb.collection("users").authWithOAuth2({
    provider: "google",
    createData: { role: "user" },
  });

  const response = await api.post<UserData>("/auth/google/pocketbase", {
    record: authData.record,
  });
  return response.data;
};

export const getDashboardData = async (): Promise<UserData> => {
  const response = await api.get<{ user: UserData }>("/auth/me");
  return response.data.user;
};

export const logoutUser = async (): Promise<unknown> => {
  const response = await api.get("/auth/logout");
  return response.data;
};

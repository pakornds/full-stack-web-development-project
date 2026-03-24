import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true, // causes the browser to automatically attach cookies (including the jwt cookie) to every request.
});

// refresh JWT Token once some request failed
// Extends Axios's request config with a custom _retry flag
type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean; // false as default
};

// some endpoints shouldn't try to refresh
const shouldSkipAutoRefresh = (config: InternalAxiosRequestConfig): boolean => {
  const url = config.url ?? "";
  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/google",
    "/auth/google/callback",
  ].some((path) => url.includes(path));
};

let refreshPromise: Promise<void> | null = null;

// retry once if api returns error
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetriableRequestConfig | undefined;

    if (
      !originalConfig ||
      !error.response ||
      error.response.status !== 401 ||
      originalConfig._retry ||
      shouldSkipAutoRefresh(originalConfig)
    ) {
      return Promise.reject(error);
    }

    // if the retried request 401s again, it will not refresh again.
    originalConfig._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      // Retry the original request
      return api(originalConfig);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;

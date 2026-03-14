import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true, // causes the browser to automatically attach cookies (including the jwt cookie) to every request.
});

export default api;

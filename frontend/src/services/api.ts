import axios from "axios";

// Using relative path "/api"
// The proxy server will forward these requests to the backend
const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

export default api;
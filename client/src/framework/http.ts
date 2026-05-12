import axios from "axios";
const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json;charset=UTF-8",
  },
});

http.interceptors.request.use(
  (config: any) => {
    config.headers = {
      ...config.headers,
    };

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default http;

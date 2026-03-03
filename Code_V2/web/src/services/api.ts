import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// Production (nginx proxy): empty string → relative /api/...
// Development: VITE_API_URL=http://10.20.30.1
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token from localStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('vsms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('vsms_token');
            localStorage.removeItem('vsms_user');
            // Auth context will detect and redirect
        }
        return Promise.reject(error);
    }
);

export default api;

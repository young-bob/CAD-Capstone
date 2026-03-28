import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// Production (nginx proxy): empty string → relative /api/...
// Development: VITE_API_URL=http://10.20.30.1
const DEV_API_BASE_URL = (import.meta.env.VITE_DEV_API_BASE_URL || 'http://10.20.30.1').trim();
const API_BASE_URL = import.meta.env.DEV
    ? DEV_API_BASE_URL
    : (import.meta.env.VITE_API_URL || '').trim();

if (import.meta.env.DEV) {
    // Helpful runtime signal to confirm which base URL the current bundle is using.
    console.info('[VSMS][DEV] API_BASE_URL =', API_BASE_URL || '(relative /api)');
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token from localStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (import.meta.env.DEV) {
        config.baseURL = DEV_API_BASE_URL;
        if (typeof config.url === 'string') {
            config.url = config.url
                .replace(/^https?:\/\/localhost:8080/i, '')
                .replace(/^https?:\/\/127\.0\.0\.1:8080/i, '');
        }
    }

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
            const url = error.config?.url || '';
            // Don't auto-logout on auth endpoints (wrong password returns 401 too)
            if (!url.includes('/api/auth/')) {
                localStorage.removeItem('vsms_token');
                localStorage.removeItem('vsms_user');
                window.dispatchEvent(new Event('vsms-unauthorized'));
            }
        }
        return Promise.reject(error);
    }
);

export default api;

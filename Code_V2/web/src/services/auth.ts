import api from './api';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authService = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const res = await api.post<AuthResponse>('/api/auth/login', data);
        return res.data;
    },
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const res = await api.post<AuthResponse>('/api/auth/register', data);
        return res.data;
    },
};

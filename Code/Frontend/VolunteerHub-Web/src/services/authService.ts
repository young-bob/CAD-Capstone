import { apiClient } from '@/lib/apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'Volunteer' | 'Coordinator';
  phoneNumber?: string;
  bio?: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  role: string;
  message: string;
}

export interface MeResponse {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('/api/auth/register', data),

  logout: () =>
    apiClient.post<{ message: string }>('/api/auth/logout'),

  me: () =>
    apiClient.get<MeResponse>('/api/auth/me'),
};

import { UserRole } from './enums';

export interface AuthResponse {
    token: string;
    email: string;
    role: UserRole;
    userId: string;
    linkedGrainId: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
}

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth';
import type { UserRole, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
    token: string | null;
    userId: string | null;
    email: string | null;
    role: UserRole | null;
    linkedGrainId: string | null;
    loading: boolean;
}

type AuthAction =
    | { type: 'LOGIN'; payload: { token: string; userId: string; email: string; role: UserRole; linkedGrainId: string | null } }
    | { type: 'LOGOUT' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_LINKED_GRAIN'; payload: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN':
            return { ...state, ...action.payload, loading: false };
        case 'LOGOUT':
            return { token: null, userId: null, email: null, role: null, linkedGrainId: null, loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_LINKED_GRAIN':
            return { ...state, linkedGrainId: action.payload };
        default:
            return state;
    }
}

interface AuthContextValue extends AuthState {
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    setLinkedGrainId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, {
        token: null, userId: null, email: null, role: null, linkedGrainId: null, loading: true,
    });

    // Restore session from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('vsms_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                dispatch({ type: 'LOGIN', payload: user });
            } catch {
                localStorage.removeItem('vsms_user');
                localStorage.removeItem('vsms_token');
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        } else {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    // Listen for 401 unauthorized event dispatched by API interceptor
    useEffect(() => {
        const handler = () => dispatch({ type: 'LOGOUT' });
        window.addEventListener('vsms-unauthorized', handler);
        return () => window.removeEventListener('vsms-unauthorized', handler);
    }, []);

    const login = async (data: LoginRequest) => {
        const res = await authService.login(data);
        localStorage.setItem('vsms_token', res.token);
        const userPayload = {
            token: res.token,
            userId: res.userId,
            email: res.email,
            role: res.role,
            linkedGrainId: res.linkedGrainId,
        };
        localStorage.setItem('vsms_user', JSON.stringify(userPayload));
        dispatch({ type: 'LOGIN', payload: userPayload });
    };

    const register = async (data: RegisterRequest) => {
        const res = await authService.register(data);
        localStorage.setItem('vsms_token', res.token);
        const userPayload = {
            token: res.token,
            userId: res.userId,
            email: res.email,
            role: res.role,
            linkedGrainId: res.linkedGrainId,
        };
        localStorage.setItem('vsms_user', JSON.stringify(userPayload));
        dispatch({ type: 'LOGIN', payload: userPayload });
    };

    const logout = () => {
        localStorage.removeItem('vsms_token');
        localStorage.removeItem('vsms_user');
        dispatch({ type: 'LOGOUT' });
    };

    const setLinkedGrainId = (id: string) => {
        const stored = localStorage.getItem('vsms_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                localStorage.setItem('vsms_user', JSON.stringify({ ...user, linkedGrainId: id }));
            } catch { /* ignore */ }
        }
        dispatch({ type: 'SET_LINKED_GRAIN', payload: id });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, setLinkedGrainId }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

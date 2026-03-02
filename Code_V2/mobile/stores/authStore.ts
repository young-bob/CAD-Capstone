import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse } from '../types/auth';
import { UserRole } from '../types/enums';

interface AuthState {
    token: string | null;
    userId: string | null;
    email: string | null;
    role: UserRole | null;
    linkedGrainId: string | null;
    isLoading: boolean;

    setAuth: (data: AuthResponse) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    userId: null,
    email: null,
    role: null,
    linkedGrainId: null,
    isLoading: true,

    setAuth: async (data: AuthResponse) => {
        await SecureStore.setItemAsync('token', data.token);
        await SecureStore.setItemAsync('user', JSON.stringify(data));
        set({
            token: data.token,
            userId: data.userId,
            email: data.email,
            role: data.role as UserRole,
            linkedGrainId: data.linkedGrainId,
            isLoading: false,
        });
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({
            token: null,
            userId: null,
            email: null,
            role: null,
            linkedGrainId: null,
            isLoading: false,
        });
    },

    loadToken: async () => {
        try {
            const userJson = await SecureStore.getItemAsync('user');
            if (userJson) {
                const data: AuthResponse = JSON.parse(userJson);
                set({
                    token: data.token,
                    userId: data.userId,
                    email: data.email,
                    role: data.role as UserRole,
                    linkedGrainId: data.linkedGrainId,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));

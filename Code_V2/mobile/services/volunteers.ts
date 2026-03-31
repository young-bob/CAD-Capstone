import api from './api';
import { AttendanceSummary } from '../types/attendance';

export interface VolunteerProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio: string;
    isProfilePublic: boolean;
    impactScore: number;
    totalHours: number;
    completedOpportunities: number;
    credentials: string[];
    isInitialized: boolean;
}

export const volunteerService = {
    getProfile: async (id: string): Promise<VolunteerProfile> => {
        const res = await api.get<VolunteerProfile>(`/api/volunteers/${id}/profile`);
        return res.data;
    },

    updateProfile: async (id: string, data: { firstName: string; lastName: string; email: string; phone: string; bio: string }): Promise<void> => {
        await api.put(`/api/volunteers/${id}/profile`, data);
    },

    getApplications: async (id: string): Promise<string[]> => {
        const res = await api.get<string[]>(`/api/volunteers/${id}/applications`);
        return res.data;
    },

    uploadCredential: async (id: string, credentialUrl: string): Promise<void> => {
        await api.post(`/api/volunteers/${id}/credentials`, { credentialUrl });
    },

    submitFeedback: async (id: string, data: { opportunityId: string; rating: number; comment: string }): Promise<void> => {
        await api.post(`/api/volunteers/${id}/feedback`, data);
    },

    updatePrivacySettings: async (id: string, data: { isProfilePublic: boolean; allowEmail: boolean; allowPush: boolean }): Promise<void> => {
        await api.put(`/api/volunteers/${id}/privacy`, data);
    },

    registerPushToken: async (id: string, token: string): Promise<void> => {
        await api.post(`/api/volunteers/${id}/push-token`, { token });
    },

    getAttendance: async (id: string): Promise<AttendanceSummary[]> => {
        const res = await api.get<AttendanceSummary[]>(`/api/volunteers/${id}/attendance`);
        return res.data;
    },

    followOrg: async (volunteerId: string, orgId: string): Promise<void> => {
        await api.post(`/api/volunteers/${volunteerId}/follow/${orgId}`);
    },

    unfollowOrg: async (volunteerId: string, orgId: string): Promise<void> => {
        await api.delete(`/api/volunteers/${volunteerId}/follow/${orgId}`);
    },
};

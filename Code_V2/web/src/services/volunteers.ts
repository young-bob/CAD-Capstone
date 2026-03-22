import api from './api';
import type { VolunteerProfile, AttendanceSummary } from '../types';

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
    getAttendance: async (id: string): Promise<AttendanceSummary[]> => {
        const res = await api.get<AttendanceSummary[]>(`/api/volunteers/${id}/attendance`);
        return res.data;
    },
    uploadCredential: async (id: string, fileKey: string): Promise<void> => {
        await api.post(`/api/volunteers/${id}/credentials`, { fileKey });
    },
    submitFeedback: async (id: string, data: { opportunityId: string; rating: number; comment: string }): Promise<void> => {
        await api.post(`/api/volunteers/${id}/feedback`, data);
    },
    setBackgroundCheckStatus: async (id: string, status: string): Promise<void> => {
        await api.post(`/api/volunteers/${id}/background-check`, { status });
    },
    signWaiver: async (id: string): Promise<{ signedAt: string }> => {
        const res = await api.post<{ signedAt: string }>(`/api/volunteers/${id}/waiver`);
        return res.data;
    },
    followOrg: async (volunteerGrainId: string, orgId: string): Promise<void> => {
        await api.post(`/api/volunteers/${volunteerGrainId}/follow/${orgId}`);
    },
    unfollowOrg: async (volunteerGrainId: string, orgId: string): Promise<void> => {
        await api.delete(`/api/volunteers/${volunteerGrainId}/follow/${orgId}`);
    },
};

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
};

import api from './api';
import type { AttendanceRecordState, AttendanceSummary, DisputeSummary } from '../types';

export const attendanceService = {
    getById: async (id: string): Promise<AttendanceRecordState> => {
        const res = await api.get<AttendanceRecordState>(`/api/attendance/${id}`);
        return res.data;
    },
    getByVolunteer: async (volunteerId: string): Promise<AttendanceSummary[]> => {
        const res = await api.get<AttendanceSummary[]>(`/api/attendance/volunteer/${volunteerId}`);
        return res.data;
    },
    getByOpportunity: async (opportunityId: string): Promise<AttendanceSummary[]> => {
        const res = await api.get<AttendanceSummary[]>(`/api/attendance/opportunity/${opportunityId}`);
        return res.data;
    },
    init: async (id: string, data: { volunteerId: string; applicationId: string; opportunityId: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/init`, data);
    },
    checkIn: async (id: string, data: { lat: number; lon: number; proofPhotoUrl: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/checkin`, data);
    },
    webCheckIn: async (id: string): Promise<void> => {
        await api.post(`/api/attendance/${id}/web-checkin`);
    },
    checkOut: async (id: string): Promise<void> => {
        await api.post(`/api/attendance/${id}/checkout`);
    },
    coordinatorCheckIn: async (id: string): Promise<void> => {
        await api.post(`/api/attendance/${id}/coordinator-checkin`);
    },
    dispute: async (id: string, data: { reason: string; evidenceUrl: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/dispute`, data);
    },
    confirm: async (id: string, data: { supervisorId: string; rating: number }): Promise<void> => {
        await api.post(`/api/attendance/${id}/confirm`, data);
    },
    getPendingDisputes: async (): Promise<DisputeSummary[]> => {
        const res = await api.get<DisputeSummary[]>('/api/attendance/disputes/pending');
        return res.data;
    },
};

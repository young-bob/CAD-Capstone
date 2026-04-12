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
    init: async (id: string, data: { volunteerId: string; applicationId: string; opportunityId: string; shiftId?: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/init`, data);
    },
    checkIn: async (id: string, data: { lat: number; lon: number; proofPhotoUrl: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/checkin`, data);
    },
    qrCheckIn: async (id: string, data: { qrToken: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/qr-checkin`, data);
    },
    issueQrCheckInToken: async (data: { opportunityId: string; shiftId: string }): Promise<{
        token: string;
        qrImageUrl: string;
        opportunityId: string;
        shiftId: string;
        shiftName: string;
        window: { openAtUtc: string; closeAtUtc: string };
        generatedAtUtc: string;
        expiresAtUtc: string;
    }> => {
        const res = await api.post('/api/attendance/qr/issue', data);
        return res.data;
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
    noShowDispute: async (id: string, data: { reason: string; evidenceUrl: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/noshow-dispute`, data);
    },
    confirm: async (id: string, data: { supervisorId: string; rating: number }): Promise<void> => {
        await api.post(`/api/attendance/${id}/confirm`, data);
    },
    getPendingDisputes: async (): Promise<DisputeSummary[]> => {
        const res = await api.get<DisputeSummary[]>('/api/attendance/disputes/pending');
        return res.data;
    },
    adjust: async (id: string, data: { coordinatorId: string; newCheckIn: string; newCheckOut: string; reason: string }): Promise<void> => {
        await api.post(`/api/attendance/${id}/adjust`, data);
    },
    resolveDispute: async (id: string, data: { resolverId: string; resolution: string; adjustedHours: number }): Promise<void> => {
        await api.post(`/api/attendance/${id}/resolve`, data);
    },
    markUnderReview: async (id: string, coordinatorId: string): Promise<void> => {
        await api.post(`/api/attendance/${id}/review`, { coordinatorId });
    },
};

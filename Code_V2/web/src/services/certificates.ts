import api from './api';
import type { CertificateTemplate, GenerateCertificateResult } from '../types';

export const certificateService = {
    getTemplates: async (organizationId?: string): Promise<CertificateTemplate[]> => {
        const params = organizationId ? `?organizationId=${organizationId}` : '';
        const res = await api.get<CertificateTemplate[]>(`/api/certificates/templates${params}`);
        return res.data;
    },
    createTemplate: async (data: {
        name: string; description?: string; organizationId?: string; organizationName?: string;
        primaryColor?: string; accentColor?: string; titleText?: string; bodyTemplate?: string;
        signatoryName?: string; signatoryTitle?: string;
    }): Promise<{ id: string }> => {
        const res = await api.post<{ id: string }>('/api/certificates/templates', data);
        return res.data;
    },
    updateTemplate: async (templateId: string, data: {
        name?: string; description?: string; primaryColor?: string; accentColor?: string;
    }): Promise<void> => {
        await api.put(`/api/certificates/templates/${templateId}`, data);
    },
    deleteTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/api/certificates/templates/${templateId}`);
    },
    generate: async (volunteerId: string, templateId: string): Promise<GenerateCertificateResult> => {
        const res = await api.post<GenerateCertificateResult>('/api/certificates/generate', { volunteerId, templateId });
        return res.data;
    },
};

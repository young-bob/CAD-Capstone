import api from './api';

export interface CertificateTemplate {
    id: string;
    name: string;
    description: string;
    organizationId: string | null;
    organizationName: string | null;
    primaryColor: string;
    accentColor: string;
    isSystemPreset: boolean;
}

export interface CertificateTemplateDetail {
    id: string;
    name: string;
    description: string;
    organizationId: string | null;
    organizationName: string | null;
    logoFileKey: string | null;
    backgroundFileKey: string | null;
    primaryColor: string;
    accentColor: string;
    titleText: string | null;
    bodyTemplate: string | null;
    signatoryName: string | null;
    signatoryTitle: string | null;
    isActive: boolean;
}

export interface GenerateCertificateResult {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
}

export const certificateService = {
    // Get all available templates (system presets + org-specific)
    getTemplates: async (organizationId?: string): Promise<CertificateTemplate[]> => {
        const params = organizationId ? `?organizationId=${organizationId}` : '';
        const res = await api.get<CertificateTemplate[]>(`/api/certificates/templates${params}`);
        return res.data;
    },

    // Get a single template detail
    getTemplate: async (templateId: string): Promise<CertificateTemplateDetail> => {
        const res = await api.get<CertificateTemplateDetail>(`/api/certificates/templates/${templateId}`);
        return res.data;
    },

    // Create a new custom template (for organizations)
    createTemplate: async (data: {
        name: string;
        description?: string;
        organizationId?: string;
        organizationName?: string;
        logoFileKey?: string;
        backgroundFileKey?: string;
        primaryColor?: string;
        accentColor?: string;
        titleText?: string;
        bodyTemplate?: string;
        signatoryName?: string;
        signatoryTitle?: string;
    }): Promise<{ id: string }> => {
        const res = await api.post<{ id: string }>('/api/certificates/templates', data);
        return res.data;
    },

    // Update an existing template
    updateTemplate: async (templateId: string, data: Partial<{
        name: string;
        description: string;
        logoFileKey: string;
        backgroundFileKey: string;
        primaryColor: string;
        accentColor: string;
        titleText: string;
        bodyTemplate: string;
        signatoryName: string;
        signatoryTitle: string;
    }>): Promise<void> => {
        await api.put(`/api/certificates/templates/${templateId}`, data);
    },

    // Delete a template
    deleteTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/api/certificates/templates/${templateId}`);
    },

    // Generate a certificate PDF
    generate: async (volunteerId: string, templateId: string): Promise<GenerateCertificateResult> => {
        const res = await api.post<GenerateCertificateResult>('/api/certificates/generate', {
            volunteerId,
            templateId,
        });
        return res.data;
    },

    // Seed system preset templates (admin only, call once)
    seedPresets: async (): Promise<string> => {
        const res = await api.post<string>('/api/certificates/seed-presets');
        return res.data;
    },
};

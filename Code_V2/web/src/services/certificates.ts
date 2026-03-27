import api from './api';
import type {
    CertificateTemplate,
    GenerateCertificateResult,
    IssueCertificateResult,
    CertificateVerificationRecord,
} from '../types';

function normalizeFileKey(raw: string): string {
    const key = (raw || '').trim();
    if (!key) return '';

    if (key.startsWith('http://') || key.startsWith('https://')) {
        try {
            const u = new URL(key);
            const marker = '/api/files/download/';
            const idx = u.pathname.indexOf(marker);
            if (idx >= 0) return u.pathname.slice(idx + marker.length);
        } catch {
            // Fall through to raw key handling
        }
    }

    return key.replace(/^\/+/, '');
}

function encodeFileKeyPath(fileKey: string): string {
    return fileKey
        .split('/')
        .filter(Boolean)
        .map(part => encodeURIComponent(part))
        .join('/');
}

function isPdfBytes(bytes: Uint8Array): boolean {
    return bytes.length >= 5
        && bytes[0] === 0x25 // %
        && bytes[1] === 0x50 // P
        && bytes[2] === 0x44 // D
        && bytes[3] === 0x46 // F
        && bytes[4] === 0x2d; // -
}

export const certificateService = {
    getTemplates: async (organizationId?: string): Promise<CertificateTemplate[]> => {
        const params = organizationId ? `?organizationId=${organizationId}` : '';
        const res = await api.get<CertificateTemplate[]>(`/api/certificates/templates${params}`);
        return res.data;
    },
    createTemplate: async (data: {
        name: string; description?: string; organizationId?: string; organizationName?: string;
        templateType?: 'achievement_certificate' | 'hours_log';
        primaryColor?: string; accentColor?: string; titleText?: string; bodyTemplate?: string;
        signatoryName?: string; signatoryTitle?: string;
    }): Promise<{ id: string }> => {
        const res = await api.post<{ id: string }>('/api/certificates/templates', data);
        return res.data;
    },
    updateTemplate: async (templateId: string, data: {
        name?: string; description?: string; primaryColor?: string; accentColor?: string;
        templateType?: 'achievement_certificate' | 'hours_log';
        titleText?: string; organizationName?: string; signatoryName?: string; signatoryTitle?: string;
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
    issue: async (volunteerId: string, templateId: string, volunteerSignatureName?: string): Promise<IssueCertificateResult> => {
        const res = await api.post<IssueCertificateResult>('/api/certificates/issue', {
            volunteerId,
            templateId,
            volunteerSignatureName,
        });
        return res.data;
    },
    verify: async (certificateId: string): Promise<CertificateVerificationRecord> => {
        const res = await api.get<CertificateVerificationRecord>(`/api/certificates/verify/${encodeURIComponent(certificateId)}`);
        return res.data;
    },
    openGeneratedFile: async (fileKey: string, fileName?: string): Promise<void> => {
        const normalizedKey = encodeFileKeyPath(normalizeFileKey(fileKey));
        if (!normalizedKey) throw new Error('Invalid certificate file key.');

        const res = await api.get<ArrayBuffer>(`/api/files/download/${normalizedKey}`, { responseType: 'arraybuffer' });
        const bytes = new Uint8Array(res.data);
        if (!isPdfBytes(bytes)) {
            const detail = new TextDecoder().decode(bytes.slice(0, 200)).trim();
            throw new Error(detail || 'Downloaded certificate is not a valid PDF.');
        }

        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
            const anchor = document.createElement('a');
            anchor.href = url;
            if (fileName) anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
};

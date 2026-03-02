import api from './api';

export const fileService = {
    /**
     * Upload a file to MinIO via the backend API.
     * @param uri - Local file URI (from expo-image-picker or expo-document-picker)
     * @param fileName - The file name to store
     * @param folder - Storage folder/prefix (e.g., 'credentials', 'proof-photos')
     * @returns The stored file key (used for getUrl / delete)
     */
    upload: async (uri: string, fileName: string, folder: string = 'uploads'): Promise<string> => {
        const formData = new FormData();

        // React Native FormData accepts objects with uri/name/type
        formData.append('file', {
            uri,
            name: fileName,
            type: 'application/octet-stream',
        } as any);
        formData.append('folder', folder);

        const res = await api.post<{ fileKey: string }>('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.fileKey;
    },

    /**
     * Get a presigned download URL for a file stored in MinIO.
     * @param fileKey - The file key returned from upload
     * @returns A temporary URL valid for 1 hour
     */
    getUrl: async (fileKey: string): Promise<string> => {
        const res = await api.get<{ url: string }>(`/api/files/url/${fileKey}`);
        return res.data.url;
    },

    /**
     * Delete a file from MinIO.
     * @param fileKey - The file key returned from upload
     */
    delete: async (fileKey: string): Promise<void> => {
        await api.delete(`/api/files/${fileKey}`);
    },
};

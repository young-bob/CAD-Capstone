import api from './api';

export interface AiChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AiChatRequest {
    messages: AiChatMessage[];
    currentView?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AiChatResponse {
    reply: string;
    provider: string;
    model: string;
    role: string;
    generatedAtUtc: string;
}

export const aiService = {
    chat: async (request: AiChatRequest): Promise<AiChatResponse> => {
        const res = await api.post<AiChatResponse>('/api/ai/chat', request);
        return res.data;
    },
};

import api from './api';

export interface AiChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AiClientLocation {
    lat: number;
    lon: number;
    accuracyMeters?: number;
    capturedAtUtc?: string;
    source?: string;
}

export interface AiChatRequest {
    messages: AiChatMessage[];
    currentView?: string;
    clientLocation?: AiClientLocation;
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

export interface AiToolDefinition {
    tool: string;
    description: string;
    roles: string[];
}

export interface AiToolsResponse {
    role: string;
    total: number;
    tools: AiToolDefinition[];
}

export interface AiToolRunResponse<T = unknown> {
    tool: string;
    ok: boolean;
    data: T;
}

export const aiService = {
    chat: async (request: AiChatRequest): Promise<AiChatResponse> => {
        const res = await api.post<AiChatResponse>('/api/ai/chat', request);
        return res.data;
    },
    getTools: async (): Promise<AiToolsResponse> => {
        const res = await api.get<AiToolsResponse>('/api/ai/tools');
        return res.data;
    },
    runTool: async <T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<AiToolRunResponse<T>> => {
        const res = await api.post<AiToolRunResponse<T>>('/api/ai/tools/run', {
            tool,
            arguments: args,
        });
        return res.data;
    },
};

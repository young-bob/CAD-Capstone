/**
 * AIAssistant Component
 *
 * A floating AI chat widget for VSMS. Features:
 * - Floating orange button (bottom-right, fixed position)
 * - Light-themed slide-up chat panel matching VSMS
 * - Role-aware responses (Volunteer / Coordinator / Admin)
 * - Backend AI chat via /api/ai/chat
 * - Simulated streaming reveal for better UX
 * - Quick suggestion pills per role
 * - Typing indicator while generating response
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, Trash2, LocateFixed, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService, type AiChatMessage, type AiClientLocation } from '../services/ai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
}

interface Props {
    userRole: 'volunteer' | 'coordinator' | 'admin';
    currentView?: string;
}


// ─── Quick suggestions per role ───────────────────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
    volunteer: [
        'Recommend opportunities based on my skills and current location.',
        'Show my application statuses (latest first).',
        'Show my check-in eligible attendance records and guide me to check in.',
        'If geo check-in fails, guide me to use on-site QR fallback check-in.',
        'Show my unread notifications and summarize key items.',
        'Mark all my notifications as read (ask for my confirmation first).',
    ],
    coordinator: [
        'Show latest pending applications for my organization.',
        'Approve an application by applicationId (ask for confirmation first).',
        'Reject an application by applicationId with a reason (ask for confirmation first).',
        'Show attendance status and exceptions for an opportunity.',
        'Generate an on-site QR check-in code for a shift.',
        'Post an announcement to volunteers in my organization.',
    ],
    admin: [
        'Show system runtime overview (silos, activations, skew).',
        'Show grain distribution grouped by silo and highlight hot spots.',
        'Show pending organizations and suggest review actions.',
        'Show pending disputes that need resolution.',
        'Show user role distribution and ban status summary.',
        'Ban or unban a user by userId (ask for confirmation first).',
    ],
};

// ─── Streaming helpers ────────────────────────────────────────────────────────

/** Simulated streaming: reveals text character by character */
function simulateStream(
    text: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
): () => void {
    let i = 0;
    // Faster for longer texts, slower for short
    const delay = Math.max(8, Math.min(20, 2000 / text.length));
    const timer = setInterval(() => {
        if (i < text.length) {
            onChunk(text[i]);
            i++;
        } else {
            clearInterval(timer);
            onDone();
        }
    }, delay);
    return () => clearInterval(timer);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIAssistant({ userRole, currentView }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const [clientLocation, setClientLocation] = useState<AiClientLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const cancelRef = useRef<(() => void) | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleOpen = () => {
        setIsOpen(true);
        setHasOpened(true);
    };

    const handleCaptureLocation = () => {
        if (!('geolocation' in navigator)) {
            setLocationError('当前浏览器不支持定位。');
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            pos => {
                setClientLocation({
                    lat: Number(pos.coords.latitude.toFixed(7)),
                    lon: Number(pos.coords.longitude.toFixed(7)),
                    accuracyMeters: Number(pos.coords.accuracy.toFixed(1)),
                    capturedAtUtc: new Date().toISOString(),
                    source: 'browser_geolocation',
                });
                setIsLocating(false);
            },
            err => {
                const msg = err.code === 1
                    ? '定位权限被拒绝。'
                    : err.code === 2
                        ? '无法获取当前位置。'
                        : '定位超时，请重试。';
                setLocationError(msg);
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 60_000,
            },
        );
    };

    const sendMessage = useCallback(async (userText: string) => {
        if (!userText.trim() || isStreaming) return;

        const userInput = userText.trim();
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: userInput };
        const assistantId = crypto.randomUUID();
        const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInput('');
        setIsStreaming(true);

        const onChunk = (chunk: string) => {
            setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
            ));
        };

        const onDone = () => {
            setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, streaming: false } : m
            ));
            setIsStreaming(false);
            cancelRef.current = null;
        };

        try {
            const history: AiChatMessage[] = messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .slice(-12)
                .map(m => ({ role: m.role, content: m.content }));

            const res = await aiService.chat({
                messages: [...history, { role: 'user', content: userInput }],
                currentView,
                clientLocation: clientLocation ?? undefined,
            });

            const text = res.reply?.trim() || 'I could not generate a response.';
            const cancel = simulateStream(text, onChunk, onDone);
            cancelRef.current = cancel;
        } catch (error: any) {
            const backendError = error?.response?.data?.error || error?.message || 'AI service unavailable.';
            const fallback = [
                '当前未能从系统获取实时数据。',
                '',
                `错误信息：${backendError}`,
                '',
                '请稍后重试，或先检查 API / AI 服务连通性。',
            ].join('\n');
            await new Promise(r => setTimeout(r, 400));
            const cancel = simulateStream(fallback, onChunk, onDone);
            cancelRef.current = cancel;
        }
    }, [isStreaming, messages, userRole, currentView, clientLocation]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim()) sendMessage(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleClose = () => {
        if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
        setIsStreaming(false);
        setIsOpen(false);
    };

    const handleClearChat = () => {
        if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
        setIsStreaming(false);
        setMessages([]);
        setInput('');
    };

    const roleBadgeColor: Record<string, string> = {
        volunteer: 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60',
        coordinator: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
        admin: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    };

    const suggestions = SUGGESTIONS[userRole] || SUGGESTIONS.volunteer;
    const locationSummary = clientLocation
        ? `${clientLocation.lat.toFixed(5)}, ${clientLocation.lon.toFixed(5)} · ±${Math.round(clientLocation.accuracyMeters ?? 0)}m`
        : 'Not set';

    return (
        <>
            {/* ── Floating Button ── */}
            <button
                onClick={handleOpen}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 flex items-center justify-center hover:from-orange-400 hover:to-orange-500 transition-all hover:scale-110 active:scale-95"
                title="AI Assistant"
                style={{ display: isOpen ? 'none' : 'flex' }}
            >
                {/* Pulse ring — only before first open */}
                {!hasOpened && (
                    <span className="absolute inset-0 rounded-full bg-orange-500 opacity-30 animate-ping" />
                )}
                <Sparkles className="w-6 h-6" />
            </button>

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-[9999] flex flex-col animate-slide-up"
                    style={{ width: 'min(760px, calc(100vw - 24px))', height: 'min(78vh, 760px)' }}
                >
                    <div className="flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-[#fffaf5] dark:bg-zinc-900 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-none">AI Assistant</p>
                                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">Powered by VSMS</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${roleBadgeColor[userRole]}`}>
                                    {userRole} Mode
                                </span>
                                <button
                                    onClick={handleClearChat}
                                    disabled={messages.length === 0 && !input.trim()}
                                    className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Clear chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#fafafa] dark:bg-zinc-950" style={{ minHeight: 0 }}>
                            {/* Welcome message */}
                            {messages.length === 0 && (
                                <div className="flex gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                                        <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
                                            Hi! I'm your VSMS assistant. How can I help you today? 👋
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-orange-500 text-white rounded-2xl rounded-br-sm'
                                                : 'bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 rounded-2xl rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.role === 'assistant' && msg.streaming && msg.content === '' ? (
                                            /* Typing indicator */
                                            <span className="flex items-center gap-1 h-5">
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-zinc-500" />
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-zinc-500" />
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-zinc-500" />
                                            </span>
                                        ) : msg.role === 'assistant' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                                                    li: ({ children }) => <li>{children}</li>,
                                                    a: ({ href, children }) => (
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 underline"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                    code: ({ className, children }) => {
                                                        const isBlockCode = (className ?? '').includes('language-');
                                                        return isBlockCode ? (
                                                            <code className="block w-full overflow-x-auto p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 font-mono text-[0.9em] whitespace-pre">
                                                                {children}
                                                            </code>
                                                        ) : (
                                                            <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-mono text-[0.92em]">
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="pl-3 border-l-2 border-orange-300 dark:border-orange-700 text-gray-600 dark:text-zinc-400 italic mb-2">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="border-t border-gray-200 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-900">
                            <div className="px-3 pt-2 pb-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="text-[11px] text-gray-600 dark:text-zinc-400">Quick Prompts · {userRole.toUpperCase()}</div>
                                    <button
                                        type="button"
                                        onClick={handleCaptureLocation}
                                        disabled={isStreaming || isLocating}
                                        className="inline-flex items-center gap-1 text-[11px] text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-gray-200 dark:border-zinc-700 hover:border-orange-200 dark:hover:border-orange-800 px-2 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Use current browser location"
                                    >
                                        <LocateFixed className="w-3.5 h-3.5" />
                                        {isLocating ? 'Locating…' : 'Use My Location'}
                                    </button>
                                </div>
                                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-zinc-400">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Location: {locationSummary}</span>
                                </div>
                                {locationError && (
                                    <div className="mb-2 text-[11px] text-rose-600 dark:text-rose-400">{locationError}</div>
                                )}
                                <div className="flex flex-wrap gap-2 pb-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={`quick-${i}`}
                                            type="button"
                                            onClick={() => sendMessage(s)}
                                            disabled={isStreaming}
                                            className="text-xs text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-gray-200 dark:border-zinc-700 hover:border-orange-200 dark:hover:border-orange-800 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex items-end gap-2 px-3 pb-3"
                            >
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything about VSMS…"
                                    rows={1}
                                    disabled={isStreaming}
                                    className="flex-1 resize-none bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-500 dark:placeholder-zinc-500 text-sm px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 border border-gray-300 dark:border-zinc-700 disabled:opacity-50"
                                    style={{ maxHeight: '140px', overflowY: 'auto' }}
                                />
                                <button
                                    type="submit"
                                    disabled={isStreaming || !input.trim()}
                                    className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

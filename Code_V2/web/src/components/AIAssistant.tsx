/**
 * AIAssistant Component
 *
 * A floating AI chat widget for VSMS. Features:
 * - Floating purple button (bottom-right, fixed position)
 * - Dark-themed slide-up chat panel
 * - Role-aware responses (Volunteer / Coordinator / Admin)
 * - Simulated streaming (character-by-character reveal) for demo
 * - Real Anthropic API when VITE_ANTHROPIC_API_KEY is set in .env
 * - Quick suggestion pills per role
 * - Typing indicator while generating response
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

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

// ─── Role-aware system prompt ─────────────────────────────────────────────────
function buildSystemPrompt(role: string, currentView?: string): string {
    const roleCtx: Record<string, string> = {
        volunteer: `You are a friendly AI assistant for VSMS (Volunteer Service Management System).
The user is a VOLUNTEER. Help them with:
- Finding and applying for volunteer opportunities (status: Pending → Approved/Waitlisted/Rejected)
- Understanding "Promoted" status: waitlisted volunteers promoted to approved when spots open
- Geo-based check-in: arrive at the event location, tap "Check In Now", confirm with GPS
- Impact score: increases with completed events and logged hours
- Certificate collection: issued automatically after attendance is confirmed by coordinator
- Managing skills profile: add skills to improve opportunity matching score
- Opportunity matching: AI scoring based on skill overlap + distance
Keep answers concise and friendly. Use bullet points when listing steps.`,

        coordinator: `You are a helpful AI assistant for VSMS (Volunteer Service Management System).
The user is a COORDINATOR managing a volunteer organization. Help them with:
- Creating opportunities: navigate to "Manage Events", click "+", fill in title/location/shifts
- Approval policies: AutoApprove (all accepted), ManualApprove (review each), InviteOnly (coordinator invites)
- Reviewing applications: go to "Applications", approve or reject pending volunteers
- Issuing certificates: generate from "Cert Templates" after event completion
- Monitoring attendance: view check-in/check-out records per opportunity
- Managing members: invite coordinators/members via "Members" page
- Organization status: PendingApproval → Approved → Suspended if needed
Keep answers concise and action-oriented.`,

        admin: `You are a helpful AI assistant for VSMS (Volunteer Service Management System).
The user is a SYSTEM ADMINISTRATOR. Help them with:
- Approving organizations: go to "Organizations", review pending applications, approve or reject
- Managing users: "User Control" → ban, unban, reset password, or delete accounts
- Resolving disputes: "Disputes" → view attendance disputes, resolve with reason
- Global skills taxonomy: "Skills" → add, edit, or delete skills used across the platform
- System health: "System Info" → Orleans grain activations, silo health, CPU/memory metrics
- Grain distribution: shows how actor workloads are spread across server nodes
Keep answers technical and precise.`,
    };

    const viewHint = currentView ? `\nThe user is currently on the "${currentView}" page.` : '';
    return (roleCtx[role] || roleCtx.volunteer) + viewHint;
}

// ─── Mock response bank (keyword-matched) ────────────────────────────────────
const MOCK_RESPONSES: Record<string, string[]> = {
    apply: [
        `To apply for a volunteer opportunity:\n\n1. Go to **Find Opportunities** in the sidebar\n2. Browse or search for an event that interests you\n3. Click on the opportunity card to view details\n4. Select a shift and click **Apply**\n\nYour application will show as **Pending** until the coordinator reviews it. Good luck! 🙌`,
    ],
    'impact score': [
        `Your **Impact Score** reflects your volunteer contributions:\n\n- **+10 points** for each completed opportunity\n- **+1 point** per volunteer hour logged\n- Displayed on your profile and dashboard\n\nHigher scores improve your opportunity matching rank. Keep volunteering to grow it! ⭐`,
    ],
    'check in|checkin|geo|attendance': [
        `For **Geo Check-In**:\n\n1. Go to **Geo Check-in** in the sidebar\n2. Find your approved shift that's starting\n3. Click **Check In Now** (available 30 min before shift start)\n4. Allow location access when prompted\n5. Confirm your position on the map\n6. Click **Confirm Check-In**\n\nCheck out the same way after your shift ends. Your hours are calculated automatically. 📍`,
    ],
    certificate: [
        `**Certificates** are issued automatically after:\n\n1. You complete a volunteer shift\n2. The coordinator confirms your attendance\n3. The system generates a PDF certificate\n\nTo download yours, go to **Certificates** in the sidebar. You can download and share them anytime. 🏆`,
    ],
    skill: [
        `To manage your **Skills**:\n\n1. Go to **My Skills** in the sidebar\n2. Click **+ Add Skill** to browse available skills\n3. Add skills that match your experience\n\nYour skills are used in **opportunity matching** — the more accurate your skills, the better your recommendations! ✨`,
    ],
    create: [
        `To **create a volunteer event** (opportunity):\n\n1. Go to **Manage Events** in the sidebar\n2. Click the **+** (plus) button\n3. Fill in: title, description, location, and approval policy\n4. Add one or more **shifts** (date, time, capacity)\n5. Click **Publish** when ready\n\nVolunteers can then apply for your event! 📋`,
    ],
    'approval polic': [
        `There are **3 approval policies** for opportunities:\n\n- **AutoApprove**: Applications are accepted instantly (no review needed)\n- **ManualApprove**: You review and approve/reject each application\n- **InviteOnly**: Only volunteers you personally invite can join\n\nChoose based on how much control you want over who participates. 🎯`,
    ],
    application: [
        `To **review volunteer applications**:\n\n1. Go to **Applications** in the sidebar\n2. You'll see all pending applications for your events\n3. Click an application to view volunteer details\n4. Choose **Approve** or **Reject**\n\nApproved volunteers are notified immediately. Waitlisted applicants are promoted automatically when spots open. ✅`,
    ],
    organization: [
        `To **approve or reject an organization**:\n\n1. Go to **Organizations** in the sidebar\n2. You'll see a list of pending applications\n3. Click **Approve** or **Reject** with a reason\n\nApproved organizations can immediately start creating events and inviting volunteers. 🏢`,
    ],
    ban: [
        `To **ban a user**:\n\n1. Go to **User Control** in the sidebar\n2. Search for the user by email or name\n3. Click the user row to expand options\n4. Click **Ban User** and confirm\n\nBanned users cannot log in until you **Unban** them. Use this for policy violations. 🚫`,
    ],
    dispute: [
        `To **resolve an attendance dispute**:\n\n1. Go to **Disputes** in the sidebar\n2. View the dispute details (volunteer name, event, reason)\n3. Review the evidence if provided\n4. Click **Resolve** and enter your decision\n\nThe volunteer and coordinator are notified of the resolution. ⚖️`,
    ],
};

function getMockResponse(input: string, role: string): string {
    const lower = input.toLowerCase();

    for (const [key, responses] of Object.entries(MOCK_RESPONSES)) {
        const patterns = key.split('|');
        if (patterns.some(p => lower.includes(p))) {
            return responses[0];
        }
    }

    // Fallback per role
    const fallbacks: Record<string, string> = {
        volunteer: `I can help you with:\n\n- **Finding & applying** for opportunities\n- **Geo check-in** process\n- **Impact score** and tracking\n- **Certificate** collection\n- **Skills** management\n\nWhat would you like to know? 😊`,
        coordinator: `I can help you with:\n\n- **Creating events** and shifts\n- **Approval policies** (Auto, Manual, InviteOnly)\n- **Reviewing applications**\n- **Certificate templates**\n- **Member management**\n\nWhat do you need help with? 💼`,
        admin: `I can help you with:\n\n- **Approving organizations**\n- **User management** (ban, reset password)\n- **Dispute resolution**\n- **Skills taxonomy**\n- **System health metrics**\n\nWhat would you like to know? 🛡️`,
    };

    return fallbacks[role] || fallbacks.volunteer;
}

// ─── Quick suggestions per role ───────────────────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
    volunteer: [
        'How do I apply for an opportunity?',
        'What is my impact score?',
        'How does geo check-in work?',
        'How do I get a certificate?',
    ],
    coordinator: [
        'How do I create an event?',
        'What are approval policies?',
        'How do I approve applications?',
    ],
    admin: [
        'How do I approve an organization?',
        'How do I ban a user?',
        'How do I resolve a dispute?',
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

/** Real Anthropic API streaming */
async function anthropicStream(
    messages: { role: string; content: string }[],
    systemPrompt: string,
    apiKey: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
): Promise<void> {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                stream: true,
                system: systemPrompt,
                messages,
            }),
        });

        if (!response.ok) {
            onError(`API error ${response.status}. Falling back to offline mode.`);
            return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                        onChunk(parsed.delta.text);
                    }
                } catch { /* skip malformed */ }
            }
        }
        onDone();
    } catch {
        onError('Network error. Falling back to offline mode.');
    }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIAssistant({ userRole, currentView }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
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

    const sendMessage = useCallback(async (userText: string) => {
        if (!userText.trim() || isStreaming) return;

        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: userText.trim() };
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

        const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;

        if (apiKey) {
            // Real API mode
            const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            await anthropicStream(
                [...history, { role: 'user', content: userText.trim() }],
                buildSystemPrompt(userRole, currentView),
                apiKey,
                onChunk,
                onDone,
                (errMsg) => {
                    // Fall back to mock on API error
                    const mockText = getMockResponse(userText, userRole) +
                        `\n\n_⚠️ ${errMsg}_`;
                    const cancel = simulateStream(mockText, onChunk, onDone);
                    cancelRef.current = cancel;
                },
            );
        } else {
            // Mock mode
            const mockText = getMockResponse(userText, userRole);
            // Small initial delay to feel more realistic
            await new Promise(r => setTimeout(r, 400));
            const cancel = simulateStream(mockText, onChunk, onDone);
            cancelRef.current = cancel;
        }
    }, [isStreaming, messages, userRole, currentView]);

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

    const roleBadgeColor: Record<string, string> = {
        volunteer: 'bg-amber-500/20 text-amber-300',
        coordinator: 'bg-blue-500/20 text-blue-300',
        admin: 'bg-rose-500/20 text-rose-300',
    };

    const suggestions = SUGGESTIONS[userRole] || SUGGESTIONS.volunteer;

    // Render markdown-ish bold (**text**) in message content
    function renderContent(text: string) {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            // Render newlines
            return part.split('\n').map((line, j, arr) => (
                <span key={`${i}-${j}`}>
                    {line}
                    {j < arr.length - 1 && <br />}
                </span>
            ));
        });
    }

    return (
        <>
            {/* ── Floating Button ── */}
            <button
                onClick={handleOpen}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-500/40 flex items-center justify-center hover:from-violet-500 hover:to-purple-600 transition-all hover:scale-110 active:scale-95"
                title="AI Assistant"
                style={{ display: isOpen ? 'none' : 'flex' }}
            >
                {/* Pulse ring — only before first open */}
                {!hasOpened && (
                    <span className="absolute inset-0 rounded-full bg-purple-500 opacity-30 animate-ping" />
                )}
                <Sparkles className="w-6 h-6" />
            </button>

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-[9999] flex flex-col animate-slide-up"
                    style={{ width: 'calc(min(384px, 100vw - 24px))', maxHeight: '520px' }}
                >
                    <div className="flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                        style={{ background: '#09090b' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white leading-none">AI Assistant</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Powered by VSMS</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${roleBadgeColor[userRole]}`}>
                                    {userRole} Mode
                                </span>
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
                            {/* Welcome message */}
                            {messages.length === 0 && (
                                <div className="space-y-3">
                                    <div className="flex gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                Hi! I'm your VSMS assistant. How can I help you today? 👋
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quick suggestion pills */}
                                    <div className="flex flex-wrap gap-2 pl-8">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(s)}
                                                className="text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-white/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-violet-600 text-white rounded-2xl rounded-br-sm'
                                                : 'bg-gray-800 text-gray-200 rounded-2xl rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.role === 'assistant' && msg.streaming && msg.content === '' ? (
                                            /* Typing indicator */
                                            <span className="flex items-center gap-1 h-5">
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500" />
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500" />
                                                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-500" />
                                            </span>
                                        ) : msg.role === 'assistant' ? (
                                            renderContent(msg.content)
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-2 px-3 py-3 border-t border-white/10 flex-shrink-0"
                        >
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask anything about VSMS…"
                                rows={1}
                                disabled={isStreaming}
                                className="flex-1 resize-none bg-gray-800 text-white placeholder-gray-500 text-sm px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 border border-white/10 disabled:opacity-50"
                                style={{ maxHeight: '80px', overflowY: 'auto' }}
                            />
                            <button
                                type="submit"
                                disabled={isStreaming || !input.trim()}
                                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

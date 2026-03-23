import { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Clock, Users, ArrowRight, Inbox, CornerUpLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../utils/timeAgo';
import type { ViewName } from '../../types';
import type { VolReply } from '../volunteer/VolMessages';
import { VOL_REPLY_KEY } from '../volunteer/VolMessages';

interface MsgRecord { to: string; toName: string; oppTitle: string; text: string; ts: number }
const MSG_KEY = (orgId: string) => `vsms_msg_history_${orgId}`;
function getMsgHistory(orgId: string): MsgRecord[] {
    try { return JSON.parse(localStorage.getItem(MSG_KEY(orgId)) || '[]'); } catch { return []; }
}
function getVolReplies(volunteerId: string): VolReply[] {
    try { return JSON.parse(localStorage.getItem(VOL_REPLY_KEY(volunteerId)) || '[]'); } catch { return []; }
}

type ThreadEntry =
    | { kind: 'sent'; text: string; ts: number; oppTitle: string }
    | { kind: 'reply'; text: string; ts: number };

interface Props { onNavigate: (view: ViewName) => void; }

export default function CoordMessages({ onNavigate }: Props) {
    const auth = useAuth();
    const [tab, setTab] = useState<'recent' | 'conversations'>('conversations');

    // Mark all current replies as "seen" when this page is opened
    useEffect(() => {
        if (!auth.linkedGrainId) return;
        const history = getMsgHistory(auth.linkedGrainId);
        const volunteerIds = [...new Set(history.filter(r => r.to !== 'all').map(r => r.to))];
        let total = 0;
        for (const vid of volunteerIds) {
            const replies = getVolReplies(vid);
            total += replies.length;
        }
        localStorage.setItem(`vsms_coord_replies_seen_${auth.linkedGrainId}`, String(total));
    }, [auth.linkedGrainId]);

    const history = useMemo(() => {
        if (!auth.linkedGrainId) return [];
        return getMsgHistory(auth.linkedGrainId);
    }, [auth.linkedGrainId]);

    // Build per-volunteer conversation threads (sent + replies merged and sorted)
    const conversations = useMemo(() => {
        const map = new Map<string, { name: string; thread: ThreadEntry[] }>();
        for (const r of history) {
            if (r.to === 'all') continue; // skip bulk broadcasts
            if (!map.has(r.to)) map.set(r.to, { name: r.toName, thread: [] });
            map.get(r.to)!.thread.push({ kind: 'sent', text: r.text, ts: r.ts, oppTitle: r.oppTitle });
        }
        // Merge volunteer replies into each thread
        for (const [volunteerId, conv] of map.entries()) {
            const replies = getVolReplies(volunteerId);
            for (const reply of replies) {
                conv.thread.push({ kind: 'reply', text: reply.text, ts: reply.ts });
            }
            conv.thread.sort((a, b) => a.ts - b.ts);
        }
        return [...map.entries()]
            .map(([id, v]) => ({ id, ...v, lastTs: Math.max(...v.thread.map(t => t.ts)) }))
            .sort((a, b) => b.lastTs - a.lastTs);
    }, [history]);

    const totalReplies = useMemo(() =>
        conversations.reduce((sum, c) => sum + c.thread.filter(t => t.kind === 'reply').length, 0),
        [conversations]);

    const broadcastHistory = history.filter(r => r.to === 'all');

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 dark:text-zinc-100">Messages</h1>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5">
                        Conversations with volunteers
                    </p>
                </div>
                <button
                    onClick={() => onNavigate('org_applications')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    New Message
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Tip banner */}
            <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 rounded-2xl px-4 py-3">
                <MessageSquare className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-sm text-violet-700 dark:text-violet-300">
                    To message a volunteer, open <button onClick={() => onNavigate('org_applications')} className="font-bold underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-100">Applications</button> and click the message icon on their row.
                </p>
            </div>

            {/* Stats */}
            {history.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Sent</span>
                        </div>
                        <p className="text-2xl font-bold text-stone-800 dark:text-zinc-100">{history.length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Volunteers</span>
                        </div>
                        <p className="text-2xl font-bold text-stone-800 dark:text-zinc-100">{conversations.length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500 mb-1">
                            <CornerUpLeft className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Replies</span>
                        </div>
                        <p className="text-2xl font-bold text-stone-800 dark:text-zinc-100">{totalReplies}</p>
                    </div>
                </div>
            )}

            {/* Tab bar */}
            {history.length > 0 && (
                <div className="flex gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
                    {(['conversations', 'recent'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                tab === t
                                    ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm'
                                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                            }`}>
                            {t === 'conversations' ? 'Conversations' : 'Broadcasts'}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400 dark:text-zinc-600 gap-3">
                        <Inbox className="w-10 h-10 opacity-40" />
                        <p className="text-sm font-medium">No messages sent yet</p>
                        <button onClick={() => onNavigate('org_applications')} className="text-sm text-violet-500 hover:text-violet-700 font-semibold hover:underline">
                            Go to Applications to send your first message
                        </button>
                    </div>
                ) : tab === 'conversations' ? (
                    conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-zinc-600 gap-2">
                            <MessageSquare className="w-8 h-8 opacity-40" />
                            <p className="text-sm">No individual conversations yet</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div key={conv.id} className="border-b border-stone-50 dark:border-zinc-800 last:border-0">
                                {/* Volunteer header */}
                                <div className="px-5 py-3 bg-stone-50 dark:bg-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                                            {conv.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="text-sm font-bold text-stone-700 dark:text-zinc-300">{conv.name}</p>
                                    </div>
                                    <span className="text-xs text-stone-400 dark:text-zinc-600">
                                        {conv.thread.filter(t => t.kind === 'reply').length > 0
                                            ? `${conv.thread.filter(t => t.kind === 'reply').length} repl${conv.thread.filter(t => t.kind === 'reply').length === 1 ? 'y' : 'ies'}`
                                            : 'no replies yet'}
                                    </span>
                                </div>

                                {/* Thread */}
                                <div className="px-5 py-3 space-y-3">
                                    {conv.thread.map((entry, i) => (
                                        entry.kind === 'sent' ? (
                                            /* Coordinator message — right aligned */
                                            <div key={i} className="flex justify-end gap-2">
                                                <div className="max-w-xs">
                                                    {entry.oppTitle && (
                                                        <p className="text-[10px] text-stone-400 dark:text-zinc-600 text-right mb-0.5">Re: {entry.oppTitle}</p>
                                                    )}
                                                    <div className="bg-violet-500 rounded-2xl rounded-tr-sm px-3 py-2 text-white">
                                                        <p className="text-xs leading-relaxed">{entry.text}</p>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-zinc-600 text-right mt-0.5">{timeAgo(new Date(entry.ts).toISOString())} · You</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Volunteer reply — left aligned */
                                            <div key={i} className="flex justify-start gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-1">
                                                    {conv.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="max-w-xs">
                                                    <div className="bg-stone-100 dark:bg-zinc-800 rounded-2xl rounded-tl-sm px-3 py-2">
                                                        <p className="text-xs text-stone-700 dark:text-zinc-300 leading-relaxed">{entry.text}</p>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-zinc-600 mt-0.5">{timeAgo(new Date(entry.ts).toISOString())} · {conv.name}</p>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    /* Broadcast tab — bulk messages only */
                    broadcastHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-zinc-600 gap-2">
                            <MessageSquare className="w-8 h-8 opacity-40" />
                            <p className="text-sm">No broadcast messages sent yet</p>
                        </div>
                    ) : (
                        broadcastHistory.map((r, i) => (
                            <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-stone-50 dark:border-zinc-800 last:border-0 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                                <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-500 flex items-center justify-center">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-stone-800 dark:text-zinc-100">All Volunteers</p>
                                        <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0">{timeAgo(new Date(r.ts).toISOString())}</span>
                                    </div>
                                    <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">Re: {r.oppTitle}</p>
                                    <p className="text-sm text-stone-600 dark:text-zinc-400 mt-1 line-clamp-2">{r.text}</p>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}

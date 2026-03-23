import { useState, useMemo } from 'react';
import { MessageSquare, Clock, Users, ArrowRight, Inbox } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../utils/timeAgo';
import type { ViewName } from '../../types';

interface MsgRecord { to: string; toName: string; oppTitle: string; text: string; ts: number }
const MSG_KEY = (orgId: string) => `vsms_msg_history_${orgId}`;
function getMsgHistory(orgId: string): MsgRecord[] {
    try { return JSON.parse(localStorage.getItem(MSG_KEY(orgId)) || '[]'); } catch { return []; }
}

interface Props { onNavigate: (view: ViewName) => void; }

export default function CoordMessages({ onNavigate }: Props) {
    const auth = useAuth();
    const [tab, setTab] = useState<'recent' | 'byVolunteer'>('recent');

    const history = useMemo(() => {
        if (!auth.linkedGrainId) return [];
        return getMsgHistory(auth.linkedGrainId);
    }, [auth.linkedGrainId]);

    // Group by recipient for the "by volunteer" tab
    const byVolunteer = useMemo(() => {
        const map = new Map<string, { name: string; messages: MsgRecord[] }>();
        for (const r of history) {
            if (!map.has(r.to)) map.set(r.to, { name: r.toName, messages: [] });
            map.get(r.to)!.messages.push(r);
        }
        return [...map.entries()].map(([id, v]) => ({ id, ...v }));
    }, [history]);

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 dark:text-zinc-100">Messages</h1>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5">
                        Sent message history for your organization
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
                    To message a specific volunteer, open <button onClick={() => onNavigate('org_applications')} className="font-bold underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-100">Applications</button> and click the message icon on their row. Bulk notifications can be sent from the event detail page.
                </p>
            </div>

            {/* Stats */}
            {history.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Total Sent</span>
                        </div>
                        <p className="text-2xl font-bold text-stone-800 dark:text-zinc-100">{history.length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Recipients</span>
                        </div>
                        <p className="text-2xl font-bold text-stone-800 dark:text-zinc-100">{byVolunteer.length}</p>
                    </div>
                </div>
            )}

            {/* Tab bar */}
            {history.length > 0 && (
                <div className="flex gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
                    {(['recent', 'byVolunteer'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                tab === t
                                    ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm'
                                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                            }`}
                        >
                            {t === 'recent' ? 'Recent' : 'By Volunteer'}
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
                        <button
                            onClick={() => onNavigate('org_applications')}
                            className="text-sm text-violet-500 hover:text-violet-700 font-semibold hover:underline"
                        >
                            Go to Applications to send your first message
                        </button>
                    </div>
                ) : tab === 'recent' ? (
                    history.slice(0, 50).map((r, i) => (
                        <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-stone-50 dark:border-zinc-800 last:border-0 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-500 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-stone-800 dark:text-zinc-100">
                                        To: {r.toName}
                                    </p>
                                    <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0">{timeAgo(new Date(r.ts).toISOString())}</span>
                                </div>
                                <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">Re: {r.oppTitle}</p>
                                <p className="text-sm text-stone-600 dark:text-zinc-400 mt-1 line-clamp-2">{r.text}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    byVolunteer.map(v => (
                        <div key={v.id} className="border-b border-stone-50 dark:border-zinc-800 last:border-0">
                            <div className="px-5 py-3 bg-stone-50 dark:bg-zinc-800/50">
                                <p className="text-sm font-bold text-stone-700 dark:text-zinc-300">
                                    {v.name}
                                    <span className="ml-2 text-xs font-normal text-stone-400 dark:text-zinc-500">
                                        {v.messages.length} message{v.messages.length !== 1 ? 's' : ''}
                                    </span>
                                </p>
                            </div>
                            {v.messages.map((r, i) => (
                                <div key={i} className="flex items-start gap-3 px-5 py-3 border-t border-stone-50 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-stone-400 dark:text-zinc-500">Re: {r.oppTitle}</p>
                                            <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0">{timeAgo(new Date(r.ts).toISOString())}</span>
                                        </div>
                                        <p className="text-sm text-stone-600 dark:text-zinc-400 mt-0.5 line-clamp-2">{r.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

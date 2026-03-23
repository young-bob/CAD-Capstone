import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, MessageSquare, RefreshCw, CornerDownLeft, Send, X } from 'lucide-react';
import { notificationService } from '../../services/notifications';
import { useAuth } from '../../hooks/useAuth';
import type { NotificationItem } from '../../types';
import { timeAgo } from '../../utils/timeAgo';

// Shared key per volunteer — coordinator can read replies by volunteerId
export interface VolReply { text: string; ts: number; notifId?: string }
export const VOL_REPLY_KEY = (volunteerId: string) => `vsms_vol_reply_${volunteerId}`;

function loadMyReplies(volunteerId: string): VolReply[] {
    try { return JSON.parse(localStorage.getItem(VOL_REPLY_KEY(volunteerId)) || '[]'); } catch { return []; }
}
function appendReply(volunteerId: string, text: string, notifId: string) {
    const existing = loadMyReplies(volunteerId);
    existing.push({ text, ts: Date.now(), notifId });
    localStorage.setItem(VOL_REPLY_KEY(volunteerId), JSON.stringify(existing));
}

export default function VolMessages() {
    const auth = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'unread'>('all');
    const [toast, setToast] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [myReplies, setMyReplies] = useState<VolReply[]>([]);

    const repliesFor = (notifId: string) => myReplies.filter(r => r.notifId === notifId);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await notificationService.getMyNotifications(100);
            setNotifications(data);
        } catch {
            showToast('Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Load this volunteer's replies from shared localStorage
    // Use linkedGrainId (volunteer grain ID) so coordinator can read them by the same key
    useEffect(() => {
        if (auth.linkedGrainId) setMyReplies(loadMyReplies(auth.linkedGrainId));
    }, [auth.linkedGrainId]);

    const handleMarkRead = async (id: string) => {
        try {
            await notificationService.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch { /* ignore */ }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            showToast('All messages marked as read');
        } catch { /* ignore */ }
    };

    const handleReply = async (notif: NotificationItem) => {
        if (!replyText.trim() || !auth.linkedGrainId) return;
        setSending(true);
        try {
            if (!notif.isRead) {
                await notificationService.markRead(notif.id).catch(() => {});
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            }
            appendReply(auth.linkedGrainId, replyText.trim(), notif.id);
            setMyReplies(loadMyReplies(auth.linkedGrainId));
            setReplyText('');
            setReplyingTo(null);
            showToast('Reply sent');
        } finally {
            setSending(false);
        }
    };

    const displayed = tab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 dark:text-zinc-100">Messages</h1>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5">
                        Notifications and messages from coordinators
                    </p>
                </div>
                <button onClick={load} className="p-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Tab bar + mark all */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
                    {(['all', 'unread'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                tab === t
                                    ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm'
                                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                            }`}>
                            {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                        </button>
                    ))}
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                        <CheckCheck className="w-4 h-4" /> Mark all read
                    </button>
                )}
            </div>

            {toast && (
                <div className="text-sm text-center text-stone-600 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 rounded-xl py-2">{toast}</div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-orange-400 animate-spin" /></div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400 dark:text-zinc-600 gap-3">
                        <MessageSquare className="w-10 h-10 opacity-40" />
                        <p className="text-sm font-medium">{tab === 'unread' ? 'No unread messages' : 'No messages yet'}</p>
                    </div>
                ) : (
                    displayed.map((n) => {
                        const isReplying = replyingTo === n.id;
                        return (
                            <div key={n.id} className={`border-b border-stone-50 dark:border-zinc-800 last:border-0 ${!n.isRead ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
                                {/* Message row */}
                                <div className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-stone-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                                    onClick={() => !n.isRead && handleMarkRead(n.id)}>
                                    <div className="shrink-0 mt-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${!n.isRead ? 'bg-orange-400' : 'bg-transparent'}`} />
                                    </div>
                                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${!n.isRead ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' : 'bg-stone-100 dark:bg-zinc-800 text-stone-400'}`}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-stone-800 dark:text-zinc-100' : 'font-medium text-stone-700 dark:text-zinc-300'}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0 mt-0.5">{timeAgo(n.sentAt)}</span>
                                        </div>
                                        <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5">{n.message}</p>
                                        {n.senderName && <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1">From {n.senderName}</p>}
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); isReplying ? setReplyingTo(null) : (setReplyingTo(n.id), setReplyText('')); }}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            isReplying
                                                ? 'bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400'
                                                : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50'
                                        }`}>
                                        {isReplying ? <X className="w-3.5 h-3.5" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
                                        {isReplying ? 'Cancel' : 'Reply'}
                                    </button>
                                </div>

                                {/* My sent replies — shown only under the message they belong to */}
                                {repliesFor(n.id).length > 0 && (
                                    <div className="px-5 pb-3 space-y-2 ml-[52px]">
                                        {repliesFor(n.id).map((r, i) => (
                                            <div key={i} className="flex items-start gap-2 justify-end">
                                                <div className="max-w-xs bg-orange-500 rounded-2xl rounded-tr-sm px-3 py-2 text-white">
                                                    <p className="text-xs">{r.text}</p>
                                                    <p className="text-[10px] text-orange-200 mt-0.5 text-right">{timeAgo(new Date(r.ts).toISOString())}</p>
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">
                                                    You
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Inline reply compose */}
                                {isReplying && (
                                    <div className="px-5 pb-4 ml-[52px]">
                                        <div className="flex gap-2 items-end bg-stone-50 dark:bg-zinc-800 rounded-xl p-3 border border-stone-200 dark:border-zinc-700 focus-within:border-orange-300 dark:focus-within:border-orange-700 transition-colors">
                                            <textarea
                                                autoFocus
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(n); }
                                                    if (e.key === 'Escape') setReplyingTo(null);
                                                }}
                                                rows={2}
                                                placeholder={`Reply to ${n.senderName ?? 'this message'}…`}
                                                className="flex-1 bg-transparent text-sm text-stone-700 dark:text-zinc-300 placeholder-stone-400 dark:placeholder-zinc-600 outline-none resize-none"
                                            />
                                            <button
                                                onClick={() => handleReply(n)}
                                                disabled={sending || !replyText.trim()}
                                                className="shrink-0 p-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white transition-colors">
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-stone-400 dark:text-zinc-600 mt-1.5 ml-1">Enter to send · Shift+Enter for new line · Esc to cancel</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

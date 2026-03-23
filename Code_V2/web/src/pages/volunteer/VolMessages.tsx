import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { notificationService } from '../../services/notifications';
import type { NotificationItem } from '../../types';
import { timeAgo } from '../../utils/timeAgo';

function useToast() {
    const [msg, setMsg] = useState('');
    const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
    return { msg, show };
}

export default function VolMessages() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'unread'>('all');
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await notificationService.getMyNotifications(100);
            setNotifications(data);
        } catch {
            toast.show('Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

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
            toast.show('All messages marked as read');
        } catch { /* ignore */ }
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
                <button
                    onClick={load}
                    className="p-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Tab bar + actions */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
                    {(['all', 'unread'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                tab === t
                                    ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm'
                                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                            }`}
                        >
                            {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                        </button>
                    ))}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Toast */}
            {toast.msg && (
                <div className="text-sm text-center text-stone-600 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 rounded-xl py-2">
                    {toast.msg}
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400 dark:text-zinc-600 gap-3">
                        <MessageSquare className="w-10 h-10 opacity-40" />
                        <p className="text-sm font-medium">
                            {tab === 'unread' ? 'No unread messages' : 'No messages yet'}
                        </p>
                    </div>
                ) : (
                    displayed.map((n, i) => (
                        <div
                            key={n.id}
                            onClick={() => !n.isRead && handleMarkRead(n.id)}
                            className={`flex items-start gap-4 px-5 py-4 border-b border-stone-50 dark:border-zinc-800 last:border-0 transition-colors
                                ${!n.isRead
                                    ? 'bg-orange-50/50 dark:bg-orange-950/20 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/30'
                                    : 'hover:bg-stone-50 dark:hover:bg-zinc-800/40'
                                }`}
                            style={{ animationDelay: `${i * 30}ms` }}
                        >
                            {/* Unread dot */}
                            <div className="shrink-0 mt-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${!n.isRead ? 'bg-orange-400' : 'bg-transparent'}`} />
                            </div>

                            {/* Icon */}
                            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                                !n.isRead ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' : 'bg-stone-100 dark:bg-zinc-800 text-stone-400'
                            }`}>
                                <Bell className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-stone-800 dark:text-zinc-100' : 'font-medium text-stone-700 dark:text-zinc-300'}`}>
                                        {n.title}
                                    </p>
                                    <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0 mt-0.5">
                                        {timeAgo(n.sentAt)}
                                    </span>
                                </div>
                                <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                                {n.senderName && (
                                    <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1">From {n.senderName}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../../constants/config';
import { notificationService } from '../../services/notifications';
import { applicationService } from '../../services/applications';
import { NotificationItem } from '../../types/notification';
import { ApplicationSummary } from '../../types/application';
import { ApplicationStatus } from '../../types/enums';
import { useAuthStore } from '../../stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ── App-notification helpers ──────────────────────────────────────────────────

const APP_READ_KEY = 'app_notif_read_ids';

const STATUS_META: Partial<Record<ApplicationStatus, { title: string; icon: string; color: string }>> = {
    [ApplicationStatus.Approved]:   { title: 'Application Approved',   icon: 'check-circle',   color: COLORS.success },
    [ApplicationStatus.Rejected]:   { title: 'Application Rejected',   icon: 'close-circle',   color: COLORS.error },
    [ApplicationStatus.Waitlisted]: { title: 'Added to Waitlist',      icon: 'clock-outline',  color: COLORS.warning },
    [ApplicationStatus.Promoted]:   { title: 'Moved Off Waitlist',     icon: 'arrow-up-circle', color: COLORS.primary },
};

function appToNotif(app: ApplicationSummary, readIds: Set<string>): NotificationItem {
    const id = `app-${app.applicationId}`;
    const meta = STATUS_META[app.status as ApplicationStatus];
    return {
        id,
        title: meta?.title ?? `Application ${app.status}`,
        message: app.shiftName ? `${app.opportunityTitle} — ${app.shiftName}` : app.opportunityTitle,
        senderName: app.organizationName ?? null,
        sentAt: app.appliedAt,
        isRead: readIds.has(id),
    };
}

async function loadAppReadIds(): Promise<Set<string>> {
    try {
        const raw = await SecureStore.getItemAsync(APP_READ_KEY);
        return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch { return new Set<string>(); }
}

async function saveAppReadIds(ids: Set<string>): Promise<void> {
    try { await SecureStore.setItemAsync(APP_READ_KEY, JSON.stringify([...ids])); } catch { }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const { linkedGrainId } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [appReadIds, setAppReadIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const load = useCallback(async () => {
        setError(null);
        try {
            const readIds = await loadAppReadIds();
            setAppReadIds(readIds);

            const results = await Promise.allSettled([
                notificationService.getMyNotifications(),
                linkedGrainId ? applicationService.getForVolunteer(linkedGrainId) : Promise.resolve([]),
            ]);

            const dbItems: NotificationItem[] =
                results[0].status === 'fulfilled' ? results[0].value : [];

            const appItems: NotificationItem[] =
                results[1].status === 'fulfilled'
                    ? (results[1].value as ApplicationSummary[])
                        .filter(a => a.status in STATUS_META)
                        .map(a => appToNotif(a, readIds))
                    : [];

            // Merge and sort newest first
            const merged = [...dbItems, ...appItems].sort(
                (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
            );
            setNotifications(merged);
        } catch (err: any) {
            console.log('Notification load error:', err.message);
            setError(err.message ?? 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleMarkRead = async (id: string) => {
        if (id.startsWith('app-')) {
            const next = new Set([...appReadIds, id]);
            setAppReadIds(next);
            await saveAppReadIds(next);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } else {
            try {
                await notificationService.markRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            } catch { }
        }
    };

    const handleMarkAllRead = async () => {
        // Mark DB notifications via API
        try { await notificationService.markAllRead(); } catch { }

        // Mark app notifications via SecureStore
        const appIds = new Set(notifications.filter(n => n.id.startsWith('app-')).map(n => n.id));
        const next = new Set([...appReadIds, ...appIds]);
        setAppReadIds(next);
        await saveAppReadIds(next);

        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getIcon = (item: NotificationItem) => {
        if (item.id.startsWith('app-')) {
            // derive from title
            if (item.title.includes('Approved') || item.title.includes('Waitlist') && item.title.includes('Off'))
                return { name: 'check-circle', color: COLORS.success };
            if (item.title.includes('Rejected'))
                return { name: 'close-circle', color: COLORS.error };
            if (item.title.includes('Waitlist'))
                return { name: 'clock-outline', color: COLORS.warning };
        }
        return {
            name: item.isRead ? 'bell-outline' : 'bell-ring',
            color: item.isRead ? COLORS.textSecondary : COLORS.primary,
        };
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {notifications.length > 0 && (
                <View style={styles.headerBar}>
                    <View style={styles.unreadBadgeRow}>
                        <MaterialCommunityIcons name="bell" size={18} color={COLORS.primary} />
                        <Text style={styles.unreadLabel}>
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
                        </Text>
                    </View>
                    {unreadCount > 0 && (
                        <Button
                            compact
                            mode="text"
                            textColor={COLORS.primary}
                            onPress={handleMarkAllRead}
                            icon="check-all"
                        >
                            Mark all read
                        </Button>
                    )}
                </View>
            )}

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ItemSeparatorComponent={() => <Divider style={styles.separator} />}
                renderItem={({ item }) => {
                    const icon = getIcon(item);
                    return (
                        <TouchableOpacity
                            style={[styles.notifItem, !item.isRead && styles.notifUnread]}
                            onPress={() => !item.isRead && handleMarkRead(item.id)}
                            activeOpacity={item.isRead ? 1 : 0.7}
                        >
                            <View style={[styles.iconBg, { backgroundColor: item.isRead ? COLORS.surfaceLight : icon.color + '18' }]}>
                                <MaterialCommunityIcons
                                    name={icon.name as any}
                                    size={20}
                                    color={item.isRead ? COLORS.textSecondary : icon.color}
                                />
                            </View>
                            <View style={styles.notifContent}>
                                <View style={styles.notifTitleRow}>
                                    <Text style={[styles.notifTitle, !item.isRead && { color: COLORS.text, fontWeight: '700' }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: icon.color }]} />}
                                </View>
                                <Text style={styles.notifMessage} numberOfLines={2}>
                                    {item.message}
                                </Text>
                                <View style={styles.notifMeta}>
                                    {item.senderName && (
                                        <Text style={styles.sender}>{item.senderName}</Text>
                                    )}
                                    <Text style={styles.time}>{formatTime(item.sentAt)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons
                            name={error ? 'alert-circle-outline' : 'bell-sleep-outline'}
                            size={64}
                            color={error ? COLORS.error : COLORS.border}
                        />
                        <Text style={styles.emptyTitle}>{error ? 'Failed to Load' : 'No Notifications'}</Text>
                        <Text style={styles.emptyText}>
                            {error
                                ? `Error: ${error}`
                                : "You're all caught up! Notifications about your applications, shifts, and organizations will appear here."}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    unreadBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unreadLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

    list: { paddingHorizontal: 0 },
    separator: { backgroundColor: COLORS.border, height: 1 },

    notifItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: COLORS.surface,
    },
    notifUnread: {
        backgroundColor: COLORS.primary + '06',
    },
    iconBg: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12, flexShrink: 0,
    },
    notifContent: { flex: 1, minWidth: 0 },
    notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    notifTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500', flex: 1 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    notifMessage: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
    notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    sender: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    time: { color: COLORS.textSecondary, fontSize: 11 },

    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 18, marginTop: 14 },
    emptyText: { color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20, fontSize: 14 },
});

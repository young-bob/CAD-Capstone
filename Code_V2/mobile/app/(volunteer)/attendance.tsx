import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Surface, Button, Portal, Modal, TextInput, Divider } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService } from '../../services/volunteers';
import { attendanceService } from '../../services/attendance';
import { AttendanceSummary } from '../../types/attendance';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ── Status display config ─────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
    CheckedIn: '#1565C0',
    CheckedOut: '#2E7D32',
    Confirmed: '#4CAF50',
    Disputed: '#F57C00',
    Resolved: '#7B1FA2',
    NoShow: '#B71C1C',
};

const STATUS_ICON: Record<string, string> = {
    CheckedIn: 'clock-check',
    CheckedOut: 'exit-run',
    Confirmed: 'check-decagram',
    Disputed: 'alert-circle',
    Resolved: 'check-circle-outline',
    NoShow: 'close-circle',
};

const DISPUTABLE_STATUSES = ['NoShow', 'CheckedOut', 'Confirmed'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

function formatShiftDate(dateStr: string | null) {
    if (!dateStr) return 'Date TBD';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateLabel = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 0) return `Today at ${timeLabel}`;
    if (diffDays === 1) return `Tomorrow at ${timeLabel}`;
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days · ${dateLabel}`;
    return `${dateLabel} at ${timeLabel}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UpcomingShiftCard({ record }: { record: AttendanceSummary }) {
    const isPast = record.shiftStartTime ? new Date(record.shiftStartTime) < new Date() : false;
    return (
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <View style={styles.upcomingHeader}>
                    <View style={[styles.upcomingIconBg, { backgroundColor: isPast ? COLORS.error + '18' : COLORS.primary + '18' }]}>
                        <MaterialCommunityIcons
                            name={isPast ? 'calendar-remove' : 'calendar-clock'}
                            size={22}
                            color={isPast ? COLORS.error : COLORS.primary}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.title} numberOfLines={1}>{record.opportunityTitle}</Text>
                        <Text style={[styles.upcomingDate, { color: isPast ? COLORS.error : COLORS.primary }]}>
                            {formatShiftDate(record.shiftStartTime)}
                        </Text>
                    </View>
                    <Chip
                        compact
                        style={{ backgroundColor: isPast ? COLORS.error + '18' : COLORS.warning + '18' }}
                        textStyle={{ color: isPast ? COLORS.error : COLORS.warning, fontSize: 11, fontWeight: '600' }}
                    >
                        {isPast ? 'Missed?' : 'Upcoming'}
                    </Chip>
                </View>
                {isPast && (
                    <Text style={styles.upcomingHint}>
                        This shift has passed without a check-in. Contact your coordinator if this is incorrect.
                    </Text>
                )}
            </Card.Content>
        </Card>
    );
}

function HistoryCard({ record, onDispute }: { record: AttendanceSummary; onDispute: (id: string) => void }) {
    const color = STATUS_COLOR[record.status] ?? '#555';
    const icon = STATUS_ICON[record.status] ?? 'circle';
    return (
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <Text style={styles.title} numberOfLines={1}>{record.opportunityTitle}</Text>
                <View style={styles.statusRow}>
                    <Chip
                        icon={() => <MaterialCommunityIcons name={icon} size={14} color="#fff" />}
                        style={{ backgroundColor: color, height: 28 }}
                        textStyle={{ color: '#fff', fontSize: 12 }}
                    >
                        {record.status}
                    </Chip>
                    {record.totalHours > 0 && (
                        <Text style={styles.hours}>{record.totalHours.toFixed(1)} hrs</Text>
                    )}
                </View>
                <View style={styles.timeRow}>
                    {record.checkInTime && (
                        <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="login" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.timeText}>{formatDate(record.checkInTime)}</Text>
                        </View>
                    )}
                    {record.checkOutTime && (
                        <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="logout" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.timeText}>{formatDate(record.checkOutTime)}</Text>
                        </View>
                    )}
                </View>
            </Card.Content>
            {DISPUTABLE_STATUSES.includes(record.status) && (
                <Card.Actions>
                    <Button compact icon="alert-circle-outline" textColor={COLORS.warning}
                        onPress={() => onDispute(record.attendanceId)}>
                        Raise Dispute
                    </Button>
                </Card.Actions>
            )}
        </Card>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'history';

export default function AttendanceHistoryScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [records, setRecords] = useState<AttendanceSummary[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('upcoming');

    const [showDispute, setShowDispute] = useState(false);
    const [disputeForId, setDisputeForId] = useState('');
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeEvidence, setDisputeEvidence] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);

    const fetchAttendance = useCallback(async () => {
        if (!linkedGrainId) return;
        try {
            const data = await volunteerService.getAttendance(linkedGrainId);
            setRecords(data);
        } catch (err: any) {
            console.log('Fetch attendance error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAttendance();
        setRefreshing(false);
    }, [fetchAttendance]);

    const openDisputeModal = (attendanceId: string) => {
        setDisputeForId(attendanceId);
        setDisputeReason('');
        setDisputeEvidence('');
        setShowDispute(true);
    };

    const handleSubmitDispute = async () => {
        if (!disputeReason.trim()) {
            Alert.alert('Required', 'Please describe the issue.');
            return;
        }
        setSubmittingDispute(true);
        try {
            await attendanceService.dispute(disputeForId, { reason: disputeReason, evidenceUrl: disputeEvidence });
            setShowDispute(false);
            Alert.alert('Submitted', 'Your dispute has been submitted for review.');
            await fetchAttendance();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to submit dispute');
        } finally {
            setSubmittingDispute(false);
        }
    };

    const upcoming = records
        .filter(r => r.status === 'Pending')
        .sort((a, b) => {
            const aT = a.shiftStartTime ? new Date(a.shiftStartTime).getTime() : 0;
            const bT = b.shiftStartTime ? new Date(b.shiftStartTime).getTime() : 0;
            return aT - bT;
        });

    const history = records
        .filter(r => r.status !== 'Pending')
        .sort((a, b) => {
            const aT = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
            const bT = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
            return bT - aT;
        });

    const confirmedHours = history.filter(r => r.status === 'Confirmed').reduce((s, r) => s + (r.totalHours ?? 0), 0);
    const pendingHours = history.filter(r => r.status === 'CheckedIn' || r.status === 'CheckedOut').reduce((s, r) => s + (r.totalHours ?? 0), 0);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <>
            <View style={styles.container}>
                {/* Summary */}
                <Surface style={styles.summaryCard} elevation={2}>
                    <View style={styles.summaryRow}>
                        <View style={{ alignItems: 'center', flex: 1 }}>
                            <MaterialCommunityIcons name="clock-time-four" size={32} color={COLORS.primary} />
                            <Text variant="headlineMedium" style={{ color: COLORS.primary, fontWeight: 'bold', marginTop: 4 }}>
                                {confirmedHours.toFixed(1)} hrs
                            </Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Confirmed Hours</Text>
                            <Text style={{ color: COLORS.text, marginTop: 2, fontSize: 13 }}>{history.length} sessions</Text>
                        </View>
                        {pendingHours > 0 && (
                            <View style={styles.pendingBadge}>
                                <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.warning} />
                                <Text style={{ color: COLORS.warning, fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>
                                    {pendingHours.toFixed(1)} hrs
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                                    pending{'\n'}confirmation
                                </Text>
                            </View>
                        )}
                    </View>
                </Surface>

                {/* Tab bar */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
                        onPress={() => setActiveTab('upcoming')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={16}
                            color={activeTab === 'upcoming' ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'upcoming' && styles.tabLabelActive]}>
                            Upcoming
                        </Text>
                        {upcoming.length > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'upcoming' ? COLORS.primary : COLORS.textSecondary }]}>
                                <Text style={styles.tabBadgeText}>{upcoming.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                        onPress={() => setActiveTab('history')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="history"
                            size={16}
                            color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
                            History
                        </Text>
                        {history.length > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'history' ? COLORS.primary : COLORS.textSecondary }]}>
                                <Text style={styles.tabBadgeText}>{history.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Tab content */}
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                >
                    {activeTab === 'upcoming' ? (
                        upcoming.length === 0 ? (
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="calendar-check" size={64} color={COLORS.border} />
                                <Text style={styles.emptyTitle}>No Upcoming Shifts</Text>
                                <Text style={styles.emptyText}>Approved shifts will appear here before you check in.</Text>
                            </View>
                        ) : (
                            upcoming.map(r => <UpcomingShiftCard key={r.attendanceId} record={r} />)
                        )
                    ) : (
                        history.length === 0 ? (
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="calendar-blank" size={64} color={COLORS.border} />
                                <Text style={styles.emptyTitle}>No History Yet</Text>
                                <Text style={styles.emptyText}>Your completed attendance records will appear here.</Text>
                            </View>
                        ) : (
                            history.map(r => <HistoryCard key={r.attendanceId} record={r} onDispute={openDisputeModal} />)
                        )
                    )}
                </ScrollView>
            </View>

            {/* Dispute Modal */}
            <Portal>
                <Modal visible={showDispute} onDismiss={() => setShowDispute(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 8 }}>Raise Dispute</Text>
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                        If your attendance record is incorrect (e.g., wrong hours, or marked No-Show incorrectly), describe the issue below.
                    </Text>
                    <TextInput
                        label="What's wrong? *"
                        value={disputeReason}
                        onChangeText={setDisputeReason}
                        mode="outlined" multiline numberOfLines={3}
                        style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.warning} textColor={COLORS.text}
                    />
                    <TextInput
                        label="Evidence URL (optional)"
                        value={disputeEvidence}
                        onChangeText={setDisputeEvidence}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text}
                        placeholder="https://..." placeholderTextColor={COLORS.textSecondary}
                    />
                    <Button mode="contained" onPress={handleSubmitDispute} loading={submittingDispute}
                        disabled={!disputeReason.trim() || submittingDispute}
                        buttonColor={COLORS.warning} style={{ marginTop: 8 }}>
                        Submit Dispute
                    </Button>
                    <Button onPress={() => setShowDispute(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>
                        Cancel
                    </Button>
                </Modal>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16, gap: 10, paddingBottom: 32 },

    summaryCard: {
        padding: 20,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    pendingBadge: {
        alignItems: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.border,
        paddingLeft: 20, marginLeft: 16,
    },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
    tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
    tabBadge: {
        borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
    },
    tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    // Cards
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    title: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    hours: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
    timeRow: { gap: 4 },
    timeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { color: COLORS.textSecondary, fontSize: 12 },

    upcomingHeader: { flexDirection: 'row', alignItems: 'center' },
    upcomingIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    upcomingDate: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    upcomingHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 18 },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 18, marginTop: 14 },
    emptyText: { color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20, fontSize: 14 },

    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

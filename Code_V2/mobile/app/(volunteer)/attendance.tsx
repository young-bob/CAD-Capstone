import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Surface, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService } from '../../services/volunteers';
import { attendanceService } from '../../services/attendance';
import { AttendanceSummary } from '../../types/attendance';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const STATUS_COLOR: Record<string, string> = {
    CheckedIn: '#1565C0',
    CheckedOut: '#2E7D32',
    Confirmed: '#4CAF50',
    Disputed: '#F57C00',
    NoShow: '#B71C1C',
};

const STATUS_ICON: Record<string, string> = {
    CheckedIn: 'clock-check',
    CheckedOut: 'exit-run',
    Confirmed: 'check-decagram',
    Disputed: 'alert-circle',
    NoShow: 'close-circle',
};

// Statuses where a dispute can be raised
const DISPUTABLE_STATUSES = ['NoShow', 'CheckedOut', 'Confirmed'];

export default function AttendanceHistoryScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [records, setRecords] = useState<AttendanceSummary[]>([]);

    // Dispute modal state
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
            await attendanceService.dispute(disputeForId, {
                reason: disputeReason,
                evidenceUrl: disputeEvidence,
            });
            setShowDispute(false);
            Alert.alert('Submitted', 'Your dispute has been submitted for review.');
            await fetchAttendance();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to submit dispute');
        } finally {
            setSubmittingDispute(false);
        }
    };

    const totalHours = records.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Summary Card */}
                <Surface style={styles.summaryCard} elevation={3}>
                    <MaterialCommunityIcons name="clock-time-four" size={40} color={COLORS.primary} />
                    <View style={{ marginTop: 8, alignItems: 'center' }}>
                        <Text variant="headlineMedium" style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                            {totalHours.toFixed(1)} hrs
                        </Text>
                        <Text style={{ color: COLORS.textSecondary }}>Total Volunteer Hours</Text>
                        <Text style={{ color: COLORS.text, marginTop: 4 }}>{records.length} sessions</Text>
                    </View>
                </Surface>

                {/* Records */}
                {records.length === 0 ? (
                    <Card style={styles.emptyCard} mode="outlined">
                        <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                            <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.textSecondary} />
                            <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>No attendance records yet</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    records.map(record => (
                        <Card key={record.attendanceId} style={styles.card} mode="outlined">
                            <Card.Content>
                                <Text style={styles.title} numberOfLines={1}>{record.opportunityTitle}</Text>
                                <View style={styles.statusRow}>
                                    <Chip
                                        icon={() => <MaterialCommunityIcons name={STATUS_ICON[record.status] ?? 'circle'} size={14} color="#fff" />}
                                        style={{ backgroundColor: STATUS_COLOR[record.status] ?? '#555', height: 28 }}
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
                                            <Text style={styles.timeText}>
                                                {new Date(record.checkInTime).toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                    {record.checkOutTime && (
                                        <View style={styles.timeItem}>
                                            <MaterialCommunityIcons name="logout" size={14} color={COLORS.textSecondary} />
                                            <Text style={styles.timeText}>
                                                {new Date(record.checkOutTime).toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </Card.Content>
                            {/* Raise dispute button for relevant statuses */}
                            {DISPUTABLE_STATUSES.includes(record.status) && record.status !== 'Disputed' && (
                                <Card.Actions>
                                    <Button compact icon="alert-circle-outline" textColor={COLORS.warning}
                                        onPress={() => openDisputeModal(record.attendanceId)}>
                                        Raise Dispute
                                    </Button>
                                </Card.Actions>
                            )}
                        </Card>
                    ))
                )}
            </ScrollView>

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
    content: { padding: 16, gap: 10 },
    summaryCard: {
        alignItems: 'center', padding: 24, borderRadius: 16,
        backgroundColor: COLORS.surface, marginBottom: 6,
    },
    emptyCard: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    title: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    hours: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
    timeRow: { gap: 4 },
    timeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { color: COLORS.textSecondary, fontSize: 12 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

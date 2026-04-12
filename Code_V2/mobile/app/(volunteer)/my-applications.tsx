import { useState, useCallback, useEffect } from 'react';
import { View, SectionList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { Card, Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { applicationService } from '../../services/applications';
import { opportunityService } from '../../services/opportunities';
import { attendanceService } from '../../services/attendance';
import { ApplicationStatus } from '../../types/enums';
import { ApplicationSummary } from '../../types/application';
import { AttendanceSummary } from '../../types/attendance';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, string> = {
    [ApplicationStatus.Pending]: COLORS.warning,
    [ApplicationStatus.Approved]: COLORS.success,
    [ApplicationStatus.Rejected]: COLORS.error,
    [ApplicationStatus.Waitlisted]: '#9C27B0',
    [ApplicationStatus.Promoted]: COLORS.primary,
    [ApplicationStatus.Withdrawn]: COLORS.textSecondary,
    [ApplicationStatus.NoShow]: COLORS.error,
    [ApplicationStatus.Completed]: COLORS.success,
};

type TabKey = 'Upcoming' | 'Waitlisted' | 'Past';

function formatTimeRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${new Date(start).toLocaleTimeString([], opts)} 鈥?${new Date(end).toLocaleTimeString([], opts)}`;
}

function findAttendanceForApplication(
    attendanceRecords: AttendanceSummary[],
    app: Pick<ApplicationSummary, 'opportunityId' | 'shiftStartTime'>
) {
    return attendanceRecords.find((record) => {
        if (record.opportunityId !== app.opportunityId) return false;
        if (app.shiftStartTime && record.shiftStartTime) {
            return record.shiftStartTime === app.shiftStartTime;
        }
        return true;
    });
}

export default function MyApplicationsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
    const [activeTab, setActiveTab] = useState<TabKey>('Upcoming');
    const [disputeAttendanceId, setDisputeAttendanceId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeEvidence, setDisputeEvidence] = useState('');
    const [disputeLoading, setDisputeLoading] = useState(false);
    const { linkedGrainId } = useAuthStore();

    const fetchApplications = useCallback(async () => {
        try {
            if (!linkedGrainId) { setLoading(false); return; }
            const [results, attendanceRecords] = await Promise.all([
                applicationService.getForVolunteer(linkedGrainId),
                attendanceService.getByVolunteer(linkedGrainId),
            ]);
            setApplications(results);
            setAttendance(attendanceRecords);
        } catch (err: any) {
            console.log('Fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchApplications();
        setRefreshing(false);
    }, [fetchApplications]);

    const handleWithdraw = async (app: ApplicationSummary) => {
        Alert.alert('Withdraw', `Withdraw from "${app.opportunityTitle} 鈥?${app.shiftName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Withdraw', style: 'destructive', onPress: async () => {
                    try {
                        await opportunityService.withdrawApplication(app.opportunityId, app.applicationId);
                        Alert.alert('Done', 'Application withdrawn');
                        await fetchApplications();
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.toString() || 'Failed to withdraw');
                    }
                }
            },
        ]);
    };

    const handleAccept = async (appId: string) => {
        try {
            await applicationService.accept(appId);
            Alert.alert('Accepted', 'You have accepted the invitation!');
            await fetchApplications();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to accept');
        }
    };

    const handleRaiseDispute = async () => {
        if (!disputeAttendanceId || !disputeReason.trim()) return;
        setDisputeLoading(true);
        try {
            await attendanceService.noShowDispute(disputeAttendanceId, { reason: disputeReason, evidenceUrl: disputeEvidence });
            Alert.alert('Submitted', 'Your dispute has been submitted for admin review.');
            setDisputeAttendanceId(null);
            setDisputeReason('');
            setDisputeEvidence('');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to submit dispute');
        } finally {
            setDisputeLoading(false);
        }
    };

    const now = Date.now();
    const isShiftPast = (app: ApplicationSummary) => !!app.shiftEndTime && new Date(app.shiftEndTime).getTime() < now;
    const activeStatuses = ['Approved', 'Pending', 'Promoted'];
    const terminalStatuses = ['Completed', 'Rejected', 'Withdrawn', 'NoShow'];
    const noShowEligibleStatuses = [ApplicationStatus.Approved, ApplicationStatus.Promoted];
    const groups: Record<TabKey, ApplicationSummary[]> = {
        Upcoming: applications.filter(a => activeStatuses.includes(a.status) && !isShiftPast(a)),
        Waitlisted: applications.filter(a => a.status === 'Waitlisted'),
        Past: applications.filter(a => terminalStatuses.includes(a.status) || (activeStatuses.includes(a.status) && isShiftPast(a))),
    };
    const tabs: TabKey[] = (['Upcoming', 'Waitlisted', 'Past'] as TabKey[]).filter(t => groups[t].length > 0);
    const visibleTab: TabKey = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? 'Upcoming');
    const visibleApps = groups[visibleTab] ?? [];

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, visibleTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, visibleTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                        <View style={[styles.tabBadge, visibleTab === tab && styles.tabBadgeActive]}>
                            <Text style={[styles.tabBadgeText, visibleTab === tab && styles.tabBadgeTextActive]}>
                                {groups[tab].length}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            <SectionList
                sections={[{ title: visibleTab, data: visibleApps }]}
                keyExtractor={(item) => item.applicationId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => {
                    const rec = findAttendanceForApplication(attendance, item);
                    const derivedNoShow =
                        item.status !== ApplicationStatus.NoShow &&
                        noShowEligibleStatuses.includes(item.status as ApplicationStatus) &&
                        isShiftPast(item) &&
                        !rec?.checkInTime &&
                        !rec?.checkOutTime;
                    const displayStatus = derivedNoShow ? ApplicationStatus.NoShow : item.status;
                    const isNoShow = displayStatus === ApplicationStatus.NoShow;
                    return (
                    <Card style={styles.card} mode="outlined">
                        <Card.Content>
                            {item.organizationName ? (
                                <View style={styles.orgRow}>
                                    <MaterialCommunityIcons name="office-building-outline" size={13} color={COLORS.textSecondary} />
                                    <Text style={styles.orgName}>{item.organizationName}</Text>
                                </View>
                            ) : null}
                            <Text variant="titleMedium" style={styles.title}>{item.opportunityTitle}</Text>
                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textSecondary} />
                                <Text style={styles.meta}>
                                    {item.shiftName ? `${item.shiftName} 路 ` : ''}
                                    {item.shiftStartTime ? new Date(item.shiftStartTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                    {item.shiftStartTime && item.shiftEndTime ? `  路  ${formatTimeRange(item.shiftStartTime, item.shiftEndTime)}` : ''}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="calendar-outline" size={13} color={COLORS.textSecondary} />
                                <Text style={styles.meta}>Applied: {new Date(item.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                            </View>
                            {rec?.checkInTime && (
                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="login" size={13} color={COLORS.success} />
                                    <Text style={styles.meta}>
                                        Check-in: {new Date(rec.checkInTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {rec.checkOutTime ? `  路  Check-out: ${new Date(rec.checkOutTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </Text>
                                </View>
                            )}
                            {isNoShow && !rec?.checkInTime && (
                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={13} color={COLORS.error} />
                                    <Text style={[styles.meta, { color: COLORS.error }]}>No check-in record found</Text>
                                </View>
                            )}
                            <Chip compact
                                style={[styles.chip, { backgroundColor: (STATUS_COLORS[displayStatus] || COLORS.textSecondary) + '20' }]}
                                textStyle={[styles.chipText, { color: STATUS_COLORS[displayStatus] || COLORS.textSecondary }]}
                            >{displayStatus}</Chip>
                        </Card.Content>
                        <Card.Actions>
                            {[ApplicationStatus.Pending, ApplicationStatus.Waitlisted, ApplicationStatus.Approved, ApplicationStatus.Promoted].includes(item.status as ApplicationStatus) && (
                                <Button compact textColor={COLORS.error} onPress={() => handleWithdraw(item)}>Withdraw</Button>
                            )}
                            {item.status === ApplicationStatus.Promoted && (
                                <Button compact mode="contained" buttonColor={COLORS.success} onPress={() => handleAccept(item.applicationId)}>Accept Invitation</Button>
                            )}
                            {isNoShow && rec?.attendanceId && (
                                <Button
                                    compact
                                    mode="outlined"
                                    icon="alert-circle-outline"
                                    textColor={COLORS.warning}
                                    style={styles.disputeButton}
                                    onPress={() => { setDisputeAttendanceId(rec.attendanceId); setDisputeReason(''); setDisputeEvidence(''); }}
                                >
                                    Raise Dispute
                                </Button>
                            )}
                        </Card.Actions>
                    </Card>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Applications Yet</Text>
                        <Text style={styles.emptyText}>Apply to opportunities from the Explore tab</Text>
                        <Text style={styles.emptyHint}>Pull down to refresh.</Text>
                    </View>
                }
            />

            {/* Dispute Modal */}
            <Modal visible={!!disputeAttendanceId} transparent animationType="fade" onRequestClose={() => setDisputeAttendanceId(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text variant="titleMedium" style={styles.modalTitle}>Raise Dispute</Text>
                        <Text style={styles.modalHint}>Describe why you believe the NoShow mark is incorrect.</Text>
                        <TextInput
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            placeholder="Reason (required)"
                            multiline
                            numberOfLines={3}
                            style={styles.textInput}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        <TextInput
                            value={disputeEvidence}
                            onChangeText={setDisputeEvidence}
                            placeholder="Evidence URL (optional)"
                            style={[styles.textInput, { marginTop: 8 }]}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        <View style={styles.modalActions}>
                            <Button compact textColor={COLORS.textSecondary} onPress={() => setDisputeAttendanceId(null)}>Cancel</Button>
                            <Button compact mode="contained" buttonColor={COLORS.warning} loading={disputeLoading}
                                disabled={!disputeReason.trim() || disputeLoading} onPress={handleRaiseDispute}>
                                Submit
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabBarContent: { paddingHorizontal: 12, paddingTop: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginRight: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: COLORS.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    tabTextActive: { color: COLORS.primary },
    tabBadge: { marginLeft: 6, backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    tabBadgeActive: { backgroundColor: COLORS.primary + '20' },
    tabBadgeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
    tabBadgeTextActive: { color: COLORS.primary },
    list: { padding: 16 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    orgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    orgName: { color: COLORS.textSecondary, fontSize: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    title: { color: COLORS.text, marginBottom: 2 },
    meta: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
    chip: { alignSelf: 'flex-start', marginTop: 8 },
    chipText: { fontSize: 11 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4 },
    emptyHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    disputeButton: { borderColor: COLORS.warning + '80' },
    modalBox: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 8 },
    modalHint: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
    textInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surfaceLight, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
});

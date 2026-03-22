import { useState, useCallback, useEffect } from 'react';
import { View, SectionList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { applicationService } from '../../services/applications';
import { opportunityService } from '../../services/opportunities';
import { ApplicationStatus } from '../../types/enums';
import { ApplicationSummary } from '../../types/application';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
    return `${new Date(start).toLocaleTimeString([], opts)} – ${new Date(end).toLocaleTimeString([], opts)}`;
}

export default function MyApplicationsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [activeTab, setActiveTab] = useState<TabKey>('Upcoming');
    const { linkedGrainId } = useAuthStore();

    const fetchApplications = useCallback(async () => {
        try {
            if (!linkedGrainId) { setLoading(false); return; }
            const results = await applicationService.getForVolunteer(linkedGrainId);
            setApplications(results);
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
        Alert.alert('Withdraw', `Withdraw from "${app.opportunityTitle} — ${app.shiftName}"?`, [
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

    const groups: Record<TabKey, ApplicationSummary[]> = {
        Upcoming: applications.filter(a => ['Approved', 'Pending', 'Promoted'].includes(a.status)),
        Waitlisted: applications.filter(a => a.status === 'Waitlisted'),
        Past: applications.filter(a => ['Completed', 'Rejected', 'Withdrawn', 'NoShow'].includes(a.status)),
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
                renderItem={({ item }) => (
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
                                    {item.shiftName ? `${item.shiftName} · ` : ''}
                                    {item.shiftStartTime ? new Date(item.shiftStartTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                    {item.shiftStartTime && item.shiftEndTime ? `  ·  ${formatTimeRange(item.shiftStartTime, item.shiftEndTime)}` : ''}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="calendar-outline" size={13} color={COLORS.textSecondary} />
                                <Text style={styles.meta}>Applied: {new Date(item.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                            </View>
                            <Chip compact
                                style={[styles.chip, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textSecondary) + '20' }]}
                                textStyle={[styles.chipText, { color: STATUS_COLORS[item.status] || COLORS.textSecondary }]}
                            >{item.status}</Chip>
                        </Card.Content>
                        <Card.Actions>
                            {[ApplicationStatus.Pending, ApplicationStatus.Waitlisted, ApplicationStatus.Approved, ApplicationStatus.Promoted].includes(item.status as ApplicationStatus) && (
                                <Button compact textColor={COLORS.error} onPress={() => handleWithdraw(item)}>Withdraw</Button>
                            )}
                            {item.status === ApplicationStatus.Promoted && (
                                <Button compact mode="contained" buttonColor={COLORS.success} onPress={() => handleAccept(item.applicationId)}>Accept Invitation</Button>
                            )}
                        </Card.Actions>
                    </Card>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Applications Yet</Text>
                        <Text style={styles.emptyText}>Apply to opportunities from the Explore tab</Text>
                        <Text style={styles.emptyHint}>Pull down to refresh.</Text>
                    </View>
                }
            />
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
});

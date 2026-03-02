import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService } from '../../services/volunteers';
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

export default function MyApplicationsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
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
        Alert.alert('Withdraw', `Withdraw application for "${app.opportunityTitle}"?`, [
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

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={applications}
                keyExtractor={(item) => item.applicationId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => (
                    <Card style={styles.card} mode="outlined">
                        <Card.Content>
                            <View style={styles.row}>
                                <View style={styles.info}>
                                    <Text variant="titleMedium" style={styles.title}>{item.opportunityTitle}</Text>
                                    <Text style={styles.meta}>{item.shiftName}</Text>
                                    <Text style={styles.meta}>Applied: {new Date(item.appliedAt).toLocaleDateString()}</Text>
                                </View>
                                <Chip compact
                                    style={[styles.chip, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textSecondary) + '20' }]}
                                    textStyle={[styles.chipText, { color: STATUS_COLORS[item.status] || COLORS.textSecondary }]}
                                >{item.status}</Chip>
                            </View>
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
    list: { padding: 16 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    info: { flex: 1, marginRight: 12 },
    title: { color: COLORS.text },
    meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    chip: { alignSelf: 'flex-start' },
    chipText: { fontSize: 11 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4 },
    emptyHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});

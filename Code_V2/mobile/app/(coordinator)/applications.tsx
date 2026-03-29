import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Portal, Modal, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizations';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { ApplicationStatus } from '../../types/enums';
import { ApplicationSummary } from '../../types/application';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ApplicationsScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingApps, setPendingApps] = useState<ApplicationSummary[]>([]);

    // Reject modal state
    const [showReject, setShowReject] = useState(false);
    const [rejectAppId, setRejectAppId] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const fetchPending = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const allApps = await organizationService.getApplications(linkedGrainId);
            const pending = allApps.filter(a => a.status === ApplicationStatus.Pending);
            setPendingApps(pending);
        } catch (err: any) {
            console.log('Fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPending();
        setRefreshing(false);
    }, [fetchPending]);

    const handleApprove = (app: ApplicationSummary) => {
        Alert.alert(
            'Approve Application',
            `Approve ${app.volunteerName || 'this volunteer'} for "${app.opportunityTitle}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve', onPress: async () => {
                        try {
                            await applicationService.approve(app.applicationId);
                            Alert.alert('Approved! ✅', 'The volunteer has been notified.');
                            await fetchPending();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to approve');
                        }
                    }
                },
            ]
        );
    };

    const openReject = (appId: string) => {
        setRejectAppId(appId);
        setRejectReason('');
        setShowReject(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) {
            Alert.alert('Required', 'Please provide a reason for rejection.');
            return;
        }
        setRejecting(true);
        try {
            await applicationService.reject(rejectAppId, rejectReason);
            setShowReject(false);
            Alert.alert('Rejected', 'The application has been rejected.');
            await fetchPending();
        } catch (err: any) {
            Alert.alert('Error', 'Failed to reject');
        } finally {
            setRejecting(false);
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
                data={pendingApps}
                keyExtractor={(item) => item.applicationId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => (
                    <Card style={styles.card} mode="outlined">
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.name}>
                                {item.volunteerName || `Volunteer ${item.volunteerId.substring(0, 8)}…`}
                            </Text>
                            <Text style={styles.meta}>📋 {item.opportunityTitle}</Text>
                            <Text style={styles.meta}>🕑 {item.shiftName} — {new Date(item.shiftStartTime).toLocaleDateString()}</Text>
                            <Text style={styles.date}>Applied {new Date(item.appliedAt).toLocaleDateString()}</Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button compact textColor={COLORS.error} icon="close-circle-outline"
                                onPress={() => openReject(item.applicationId)}>Reject</Button>
                            <Button compact mode="contained" buttonColor={COLORS.success} icon="check-circle-outline"
                                onPress={() => handleApprove(item)}>Approve</Button>
                        </Card.Actions>
                    </Card>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={56} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
                        <Text style={styles.emptyText}>No pending applications to review.</Text>
                        <Text style={styles.emptyHint}>Pull down to refresh.</Text>
                    </View>
                }
            />

            {/* Reject Reason Modal */}
            <Portal>
                <Modal visible={showReject} onDismiss={() => setShowReject(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 8 }}>Reject Application</Text>
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                        Please provide a reason so the volunteer understands why their application was not accepted.
                    </Text>
                    <TextInput
                        label="Reason for rejection *"
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        mode="outlined" multiline numberOfLines={3}
                        style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.error} textColor={COLORS.text}
                    />
                    <Button mode="contained" onPress={handleRejectSubmit} loading={rejecting}
                        disabled={!rejectReason.trim() || rejecting}
                        buttonColor={COLORS.error} style={{ marginTop: 8 }}>
                        Confirm Reject
                    </Button>
                    <Button onPress={() => setShowReject(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>
                        Cancel
                    </Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: 16 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    name: { color: COLORS.text, marginBottom: 4 },
    meta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
    date: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4 },
    emptyHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

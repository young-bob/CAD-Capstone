import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Surface, Text, Button, ActivityIndicator, Portal, Modal, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { organizationService, OrgState } from '../../services/organizations';
import { OrgStatus } from '../../types/enums';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const STATUS_CONFIG: Record<string, { color: string; icon: string; message: string }> = {
    [OrgStatus.PendingApproval]: {
        color: COLORS.warning,
        icon: 'clock-outline',
        message: 'Your organization is pending admin approval. You cannot create events until approved.',
    },
    [OrgStatus.Approved]: {
        color: COLORS.success,
        icon: 'check-circle',
        message: 'Your organization is approved and active.',
    },
    [OrgStatus.Rejected]: {
        color: COLORS.error,
        icon: 'close-circle',
        message: 'Your organization registration has been rejected. Contact support.',
    },
    [OrgStatus.Suspended]: {
        color: COLORS.error,
        icon: 'alert-circle',
        message: 'Your organization has been suspended.',
    },
};

export default function DashboardScreen() {
    const { email, linkedGrainId, userId, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [org, setOrg] = useState<OrgState | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const [showEditOrg, setShowEditOrg] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);

    const fetchOrg = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const data = await organizationService.getById(linkedGrainId);
            setOrg(data);
        } catch (err: any) {
            // If org doesn't exist yet, show create option
            console.log('Org fetch:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchOrg(); }, [fetchOrg]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrg();
        setRefreshing(false);
    }, [fetchOrg]);

    const handleCreateOrg = async () => {
        if (!orgName || !linkedGrainId || !userId) return;
        setCreating(true);
        try {
            await organizationService.create({
                name: orgName,
                description: orgDesc,
                creatorUserId: userId,
                creatorEmail: email || '',
            });
            setShowCreate(false);
            Alert.alert('Success', 'Organization created! Awaiting admin approval.');
            await fetchOrg();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    const openEditOrg = () => {
        setEditName(org?.name || '');
        setEditDesc(org?.description || '');
        setShowEditOrg(true);
    };

    const handleSaveOrg = async () => {
        if (!linkedGrainId || !editName.trim()) return;
        setSavingOrg(true);
        try {
            // Organization update via grain - use inviteMember workaround or a dedicated endpoint
            // For now, alert to show the form has data until backend endpoint added
            await organizationService.updateInfo(linkedGrainId, { name: editName, description: editDesc });
            setShowEditOrg(false);
            Alert.alert('Success', 'Organization updated!');
            await fetchOrg();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to update');
        } finally {
            setSavingOrg(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const statusInfo = org?.status ? STATUS_CONFIG[org.status] || STATUS_CONFIG[OrgStatus.PendingApproval] : null;
    const isApproved = org?.status === OrgStatus.Approved;

    const stats = [
        { icon: 'calendar-check', label: 'Events', value: org?.opportunityIds?.length ?? 0, color: COLORS.primary },
        { icon: 'account-group', label: 'Members', value: org?.members?.length ?? 0, color: COLORS.success },
        { icon: 'shield-account', label: 'Blocked', value: org?.blockedVolunteerIds?.length ?? 0, color: COLORS.error },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            {/* Header */}
            <Text variant="headlineMedium" style={styles.greeting}>
                {org?.name || 'Organization'} 👋
            </Text>
            <Text style={styles.email}>{email}</Text>
            {org?.description ? <Text style={styles.desc}>{org.description}</Text> : null}

            {/* Status Banner */}
            {statusInfo && (
                <Surface style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]} elevation={0}>
                    <MaterialCommunityIcons name={statusInfo.icon} size={24} color={statusInfo.color} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>{org?.status}</Text>
                        <Text style={styles.statusMessage}>{statusInfo.message}</Text>
                    </View>
                </Surface>
            )}

            {/* No org yet — create one */}
            {!org?.isInitialized && (
                <Surface style={styles.createCard} elevation={2}>
                    <MaterialCommunityIcons name="office-building-plus" size={48} color={COLORS.primary} />
                    <Text style={styles.createText}>No organization found. Create one to get started.</Text>
                    <Button mode="contained" buttonColor={COLORS.primary} onPress={() => setShowCreate(true)}
                        style={{ marginTop: 12 }}>Create Organization</Button>
                </Surface>
            )}

            {/* Stats */}
            {org?.isInitialized && (
                <View style={styles.grid}>
                    {stats.map((s, i) => (
                        <Surface key={i} style={styles.statCard} elevation={2}>
                            <MaterialCommunityIcons name={s.icon} size={32} color={s.color} />
                            <Text variant="headlineMedium" style={styles.statValue}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </Surface>
                    ))}
                </View>
            )}

            {/* Actions blocked notice */}
            {org?.isInitialized && !isApproved && (
                <Surface style={styles.blockedNotice} elevation={1}>
                    <MaterialCommunityIcons name="lock" size={20} color={COLORS.warning} />
                    <Text style={styles.blockedText}>
                        Creating events, inviting members, and other actions require admin approval first.
                    </Text>
                </Surface>
            )}

            {org?.isInitialized && isApproved && (
                <Button icon="pencil" mode="outlined" onPress={openEditOrg}
                    textColor={COLORS.primary} style={{ marginBottom: 16, borderColor: COLORS.primary }}>
                    Edit Organization
                </Button>
            )}

            <Button mode="outlined" onPress={logout} textColor={COLORS.error} style={styles.logout}>
                Logout
            </Button>

            {/* Create Org Modal */}
            <Portal>
                <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Create Organization</Text>
                    <TextInput label="Name" value={orgName} onChangeText={setOrgName} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Description" value={orgDesc} onChangeText={setOrgDesc} mode="outlined"
                        multiline style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleCreateOrg} loading={creating} disabled={!orgName || creating}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Create</Button>
                </Modal>

                <Modal visible={showEditOrg} onDismiss={() => setShowEditOrg(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Edit Organization</Text>
                    <TextInput label="Organization Name" value={editName} onChangeText={setEditName} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Description" value={editDesc} onChangeText={setEditDesc} mode="outlined" multiline
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleSaveOrg} loading={savingOrg} disabled={!editName.trim() || savingOrg}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Save Changes</Button>
                    <Button onPress={() => setShowEditOrg(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Cancel</Button>
                </Modal>
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    greeting: { color: COLORS.text, marginBottom: 4 },
    email: { color: COLORS.textSecondary, marginBottom: 8 },
    desc: { color: COLORS.textSecondary, marginBottom: 16 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
    statusText: { fontWeight: '700', fontSize: 14 },
    statusMessage: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    createCard: { alignItems: 'center', padding: 32, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    createText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, padding: 20, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', minWidth: '30%' },
    statValue: { color: COLORS.text, marginTop: 12 },
    statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' },
    blockedNotice: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: COLORS.warning + '10', marginBottom: 16 },
    blockedText: { color: COLORS.textSecondary, fontSize: 12, marginLeft: 8, flex: 1 },
    logout: { borderColor: COLORS.error, marginTop: 16 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

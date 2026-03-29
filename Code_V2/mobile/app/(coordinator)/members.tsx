import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, FAB, ActivityIndicator, Portal, Modal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { organizationService, OrgState } from '../../services/organizations';
import { OrgRole } from '../../types/enums';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ROLE_COLORS: Record<string, string> = {
    [OrgRole.Admin]: COLORS.secondary,
    [OrgRole.Coordinator]: COLORS.primary,
    [OrgRole.Member]: COLORS.textSecondary,
};

export default function MembersScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [org, setOrg] = useState<OrgState | null>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrgRole>(OrgRole.Member);
    const [inviting, setInviting] = useState(false);
    const [tab, setTab] = useState('members');

    const fetchOrg = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const data = await organizationService.getById(linkedGrainId);
            setOrg(data);
        } catch (err: any) {
            console.log('Fetch error:', err.message);
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

    const handleInvite = async () => {
        if (!inviteEmail || !linkedGrainId) return;
        setInviting(true);
        try {
            await organizationService.inviteMember(linkedGrainId, { email: inviteEmail, role: inviteRole });
            setShowInvite(false);
            setInviteEmail('');
            Alert.alert('Success', 'Member invited!');
            await fetchOrg();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleBlock = async (userId: string) => {
        if (!linkedGrainId) return;
        Alert.alert('Block Volunteer', `Block volunteer ${userId.substring(0, 8)}...?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Block', style: 'destructive', onPress: async () => {
                    try {
                        await organizationService.blockVolunteer(linkedGrainId, userId);
                        Alert.alert('Done', 'Volunteer blocked');
                        await fetchOrg();
                    } catch { Alert.alert('Error', 'Failed to block'); }
                }
            },
        ]);
    };

    const handleUnblock = async (userId: string) => {
        if (!linkedGrainId) return;
        Alert.alert('Unblock Volunteer', `Unblock volunteer ${userId.substring(0, 8)}...?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Unblock', style: 'default', onPress: async () => {
                    try {
                        await organizationService.unblockVolunteer(linkedGrainId, userId);
                        Alert.alert('Done', 'Volunteer unblocked');
                        await fetchOrg();
                    } catch { Alert.alert('Error', 'Failed to unblock'); }
                }
            },
        ]);
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
            <SegmentedButtons
                value={tab}
                onValueChange={setTab}
                buttons={[
                    { value: 'members', label: 'Members' },
                    { value: 'blocked', label: 'Blocked' },
                ]}
                style={styles.tabs}
                theme={{ colors: { secondaryContainer: COLORS.primary + '30', onSecondaryContainer: COLORS.primary } }}
            />

            {tab === 'members' ? (
                <FlatList
                    data={org?.members ?? []}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    renderItem={({ item }) => (
                        <Card style={styles.card} mode="outlined">
                            <Card.Content style={styles.row}>
                                <View style={styles.info}>
                                    <Text variant="bodyLarge" style={styles.email}>{item.email}</Text>
                                    <Text style={styles.date}>Joined: {new Date(item.joinedAt).toLocaleDateString()}</Text>
                                </View>
                                <Chip compact
                                    style={{ backgroundColor: (ROLE_COLORS[item.role] || COLORS.textSecondary) + '20' }}
                                    textStyle={{ color: ROLE_COLORS[item.role], fontSize: 11 }}>{item.role}</Chip>
                            </Card.Content>
                            <Card.Actions>
                                <Button compact textColor={COLORS.error} onPress={() => handleBlock(item.userId)}>Block / Remove</Button>
                            </Card.Actions>
                        </Card>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-group-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>No members yet. Tap + to invite.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={org?.blockedVolunteerIds ?? []}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    renderItem={({ item }) => (
                        <Card style={styles.card} mode="outlined">
                            <Card.Content style={styles.row}>
                                <View style={styles.info}>
                                    <Text variant="bodyLarge" style={styles.email}>Volunteer {item.substring(0, 8)}…</Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Blocked from applying to your events</Text>
                                </View>
                            </Card.Content>
                            <Card.Actions>
                                <Button compact textColor={COLORS.success} icon="account-check" onPress={() => handleUnblock(item)}>Unblock</Button>
                            </Card.Actions>
                        </Card>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-off-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>No blocked volunteers.</Text>
                        </View>
                    }
                />
            )}
            <FAB icon="account-plus" style={styles.fab} color="#fff" onPress={() => setShowInvite(true)} />

            <Portal>
                <Modal visible={showInvite} onDismiss={() => setShowInvite(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Invite Member</Text>
                    <TextInput label="Email" value={inviteEmail} onChangeText={setInviteEmail} mode="outlined"
                        keyboardType="email-address" style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 8 }}>Role:</Text>
                    <View style={styles.roleRow}>
                        {[OrgRole.Admin, OrgRole.Coordinator, OrgRole.Member].map((r) => (
                            <Chip key={r} selected={inviteRole === r} onPress={() => setInviteRole(r)}
                                style={{ backgroundColor: inviteRole === r ? COLORS.primary + '30' : COLORS.surfaceLight }}
                                textStyle={{ color: inviteRole === r ? COLORS.primary : COLORS.textSecondary }}>{r}</Chip>
                        ))}
                    </View>
                    <Button mode="contained" onPress={handleInvite} loading={inviting} disabled={!inviteEmail || inviting}
                        buttonColor={COLORS.primary} style={{ marginTop: 16 }}>Invite</Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: 16 },
    tabs: { marginHorizontal: 16, marginTop: 16 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    row: { flexDirection: 'row', alignItems: 'center' },
    info: { flex: 1 },
    email: { color: COLORS.text },
    date: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
    empty: { alignItems: 'center', paddingTop: 40 },
    emptyText: { color: COLORS.textSecondary },
    fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
    roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
});

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, TextInput, Button, Card, Surface, ActivityIndicator, Chip } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { adminService, OrganizationSummary, UserRecord } from '../../services/admin';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OrganizationsScreen() {
    const { logout } = useAuthStore();

    // Data states
    const [pendingOrgs, setPendingOrgs] = useState<OrganizationSummary[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);

    // UI states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<{ [id: string]: string }>({});

    const fetchData = useCallback(async () => {
        try {
            const [orgs, usrs] = await Promise.all([
                adminService.getPendingOrganizations(),
                adminService.getUsers()
            ]);
            setPendingOrgs(orgs);
            setUsers(usrs);
        } catch (err: any) {
            console.error('Admin fetch error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const handleApproveOrg = async (orgId: string) => {
        setLoadingActionId(orgId);
        try {
            await adminService.approveOrg(orgId);
            Alert.alert('Success', 'Organization approved!');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to approve');
        } finally {
            setLoadingActionId(null);
        }
    };

    const handleRejectOrg = async (orgId: string) => {
        const reason = rejectReason[orgId] || '';
        if (!reason.trim()) {
            Alert.alert('Required', 'Please enter a rejection reason.');
            return;
        }
        setLoadingActionId(orgId);
        try {
            await adminService.rejectOrg(orgId, reason);
            Alert.alert('Success', 'Organization rejected');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to reject');
        } finally {
            setLoadingActionId(null);
        }
    };

    const toggleBanUser = async (user: UserRecord) => {
        setLoadingActionId(user.id);
        try {
            if (user.isBanned) {
                await adminService.unbanUser(user.id);
                Alert.alert('Success', 'User unbanned');
            } else {
                await adminService.banUser(user.id);
                Alert.alert('Success', 'User banned');
            }
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Action failed');
        } finally {
            setLoadingActionId(null);
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
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            <Surface style={styles.header} elevation={2}>
                <MaterialCommunityIcons name="shield-crown" size={48} color={COLORS.primary} />
                <Text variant="headlineSmall" style={{ color: COLORS.text, marginTop: 8 }}>Admin Panel</Text>
            </Surface>

            {/* Pending Organizations */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Pending Organizations</Text>
            {pendingOrgs.length === 0 ? (
                <Card style={styles.emptyCard} mode="outlined">
                    <Card.Content>
                        <Text style={{ color: COLORS.textSecondary }}>No pending organizations to review.</Text>
                    </Card.Content>
                </Card>
            ) : (
                pendingOrgs.map(org => (
                    <Card key={org.orgId} style={styles.card} mode="outlined">
                        <Card.Content>
                            <Text style={styles.cardTitle}>{org.name}</Text>
                            <Text style={styles.cardDesc}>{org.description}</Text>
                            <Text style={styles.cardMeta}>Applied: {new Date(org.createdAt).toLocaleDateString()}</Text>

                            <TextInput
                                label="Rejection Reason"
                                value={rejectReason[org.orgId] || ''}
                                onChangeText={(text) => setRejectReason(prev => ({ ...prev, [org.orgId]: text }))}
                                mode="outlined"
                                style={styles.input}
                                outlineColor={COLORS.border}
                                activeOutlineColor={COLORS.primary}
                                textColor={COLORS.text}
                            />

                            <View style={styles.btnRow}>
                                <Button
                                    mode="contained"
                                    buttonColor={COLORS.success}
                                    onPress={() => handleApproveOrg(org.orgId)}
                                    loading={loadingActionId === org.orgId}
                                    disabled={!!loadingActionId}
                                    style={styles.btn}
                                >
                                    Approve
                                </Button>
                                <Button
                                    mode="contained"
                                    buttonColor={COLORS.error}
                                    onPress={() => handleRejectOrg(org.orgId)}
                                    loading={loadingActionId === org.orgId}
                                    disabled={!!loadingActionId}
                                    style={styles.btn}
                                >
                                    Reject
                                </Button>
                            </View>
                        </Card.Content>
                    </Card>
                ))
            )}

            {/* Users */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 16 }]}>User Management</Text>
            {users.map(user => (
                <Card key={user.id} style={styles.card} mode="outlined">
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={styles.cardTitle}>{user.email}</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                <Chip compact style={{ backgroundColor: COLORS.surfaceLight }}>{user.role}</Chip>
                                {user.isBanned && <Chip compact style={{ backgroundColor: COLORS.error + '40' }}><Text style={{ color: COLORS.error, fontSize: 12 }}>Banned</Text></Chip>}
                            </View>
                        </View>
                        <Button
                            mode={user.isBanned ? "contained" : "outlined"}
                            textColor={user.isBanned ? undefined : COLORS.error}
                            buttonColor={user.isBanned ? COLORS.success : undefined}
                            onPress={() => toggleBanUser(user)}
                            loading={loadingActionId === user.id}
                            disabled={!!loadingActionId || user.role === 'SystemAdmin'}
                            compact
                        >
                            {user.isBanned ? 'Unban' : 'Ban'}
                        </Button>
                    </Card.Content>
                </Card>
            ))}

            <Button mode="outlined" onPress={logout} textColor={COLORS.error} style={{ marginTop: 24, marginBottom: 40, borderColor: COLORS.error }}>
                Logout
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    sectionTitle: { color: COLORS.text, marginBottom: 12 },
    emptyCard: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, marginBottom: 16 },
    card: { marginBottom: 16, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    cardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    cardDesc: { color: COLORS.textSecondary, marginBottom: 8 },
    cardMeta: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight, height: 40 },
    btnRow: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1 },
});

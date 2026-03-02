import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TextInput } from 'react-native';
import { Card, Text, Button, Chip, ActivityIndicator, Surface } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { adminService, UserRecord } from '../../services/admin';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ROLES = ['All', 'Volunteer', 'Coordinator', 'SystemAdmin'];

const ROLE_COLOR: Record<string, string> = {
    Volunteer: '#1565C0',
    Coordinator: '#4A148C',
    SystemAdmin: '#B71C1C',
};

export default function UsersScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState('All');

    const fetchUsers = useCallback(async () => {
        try {
            const results = await adminService.getUsers({
                role: selectedRole === 'All' ? undefined : selectedRole,
                search: search.trim() || undefined,
            });
            setUsers(results);
        } catch (err: any) {
            console.log('Fetch users error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedRole, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    }, [fetchUsers]);

    const handleBan = (user: UserRecord) => {
        const action = user.isBanned ? 'unban' : 'ban';
        Alert.alert(
            `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            `Are you sure you want to ${action} ${user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action.charAt(0).toUpperCase() + action.slice(1),
                    style: user.isBanned ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            if (user.isBanned) {
                                await adminService.unbanUser(user.id);
                            } else {
                                await adminService.banUser(user.id);
                            }
                            await fetchUsers();
                        } catch {
                            Alert.alert('Error', `Failed to ${action} user`);
                        }
                    }
                }
            ]
        );
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
            {/* Search Bar */}
            <Surface style={styles.searchBar} elevation={2}>
                <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by email..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    onSubmitEditing={fetchUsers}
                />
            </Surface>

            {/* Role Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {ROLES.map(role => (
                    <Chip
                        key={role}
                        selected={selectedRole === role}
                        onPress={() => setSelectedRole(role)}
                        style={{ backgroundColor: selectedRole === role ? COLORS.primary : COLORS.surface }}
                        textStyle={{ color: selectedRole === role ? '#fff' : COLORS.text }}
                    >
                        {role}
                    </Chip>
                ))}
            </ScrollView>

            {/* User List */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                <Text style={styles.count}>{users.length} users found</Text>
                {users.map(user => (
                    <Card key={user.id} style={styles.card} mode="outlined">
                        <Card.Content>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.email}>{user.email}</Text>
                                    <View style={styles.tagRow}>
                                        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[user.role] ?? '#555' }]}>
                                            <Text style={styles.roleText}>{user.role}</Text>
                                        </View>
                                        {user.isBanned && (
                                            <View style={styles.bannedBadge}>
                                                <Text style={styles.bannedText}>BANNED</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.idText}>ID: {user.id.slice(0, 8)}…</Text>
                                </View>
                                {user.role !== 'SystemAdmin' && (
                                    <Button
                                        mode="outlined"
                                        onPress={() => handleBan(user)}
                                        textColor={user.isBanned ? COLORS.primary : COLORS.error}
                                        style={{ borderColor: user.isBanned ? COLORS.primary : COLORS.error }}
                                        compact
                                    >
                                        {user.isBanned ? 'Unban' : 'Ban'}
                                    </Button>
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 16, marginBottom: 8, padding: 12, borderRadius: 12,
        backgroundColor: COLORS.surface,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 16 },
    roleRow: { flexGrow: 0, paddingVertical: 8 },
    list: { padding: 16, gap: 8 },
    count: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    email: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
    tagRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    bannedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: COLORS.error },
    bannedText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    idText: { color: COLORS.textSecondary, fontSize: 11 },
});

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator, Searchbar } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { organizationService, OrganizationSummary } from '../../services/organizations';
import { volunteerService } from '../../services/volunteers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OrganizationsScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [followLoading, setFollowLoading] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            const list = await organizationService.listApproved();
            setOrgs(list);
        } catch (err: any) {
            console.log('Orgs load error:', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleToggleFollow = async (org: OrganizationSummary) => {
        if (!linkedGrainId) return;
        setFollowLoading(org.orgId);
        try {
            if (followedIds.has(org.orgId)) {
                await volunteerService.unfollowOrg(linkedGrainId, org.orgId);
                setFollowedIds(prev => { const s = new Set(prev); s.delete(org.orgId); return s; });
            } else {
                await volunteerService.followOrg(linkedGrainId, org.orgId);
                setFollowedIds(prev => new Set([...prev, org.orgId]));
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to update follow status');
        } finally {
            setFollowLoading(null);
        }
    };

    const filtered = orgs.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Loading organizations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search organizations..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchbar}
                iconColor={COLORS.textSecondary}
                inputStyle={{ color: COLORS.text }}
            />
            <FlatList
                data={filtered}
                keyExtractor={item => item.orgId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => {
                    const isFollowing = followedIds.has(item.orgId);
                    const isLoading = followLoading === item.orgId;
                    return (
                        <Card style={styles.card} mode="outlined">
                            <Card.Content>
                                <View style={styles.cardHeader}>
                                    <View style={styles.orgIcon}>
                                        <MaterialCommunityIcons name="domain" size={24} color={COLORS.primary} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text variant="titleMedium" style={styles.orgName}>{item.name}</Text>
                                        <View style={styles.metaRow}>
                                            <MaterialCommunityIcons name="account-multiple" size={13} color={COLORS.textSecondary} />
                                            <Text style={styles.metaText}>{item.memberCount} members</Text>
                                            <MaterialCommunityIcons name="calendar-check" size={13} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
                                            <Text style={styles.metaText}>{item.opportunityCount} events</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                                {item.tags && item.tags.length > 0 && (
                                    <View style={styles.tagsRow}>
                                        {item.tags.slice(0, 3).map((tag, i) => (
                                            <Chip key={i} compact style={styles.tag} textStyle={styles.tagText}>{tag}</Chip>
                                        ))}
                                    </View>
                                )}
                                {item.websiteUrl ? (
                                    <Text style={styles.website} numberOfLines={1}>🌐 {item.websiteUrl}</Text>
                                ) : null}
                            </Card.Content>
                            <Card.Actions>
                                <Button
                                    compact
                                    mode={isFollowing ? 'outlined' : 'contained'}
                                    buttonColor={isFollowing ? undefined : COLORS.primary}
                                    textColor={isFollowing ? COLORS.error : COLORS.surface}
                                    icon={isFollowing ? 'heart-off' : 'heart'}
                                    loading={isLoading}
                                    disabled={isLoading}
                                    onPress={() => handleToggleFollow(item)}
                                >
                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                </Button>
                            </Card.Actions>
                        </Card>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="domain-off" size={56} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Organizations Found</Text>
                        <Text style={styles.emptyText}>
                            {search ? 'Try a different search term.' : 'No approved organizations are available yet.'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    searchbar: { margin: 16, backgroundColor: COLORS.surfaceLight },
    list: { padding: 16, paddingTop: 0 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    orgIcon: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: COLORS.primary + '18',
        justifyContent: 'center', alignItems: 'center',
    },
    orgName: { color: COLORS.text, fontWeight: 'bold' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    metaText: { color: COLORS.textSecondary, fontSize: 12, marginLeft: 3 },
    desc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    tag: { backgroundColor: COLORS.primary + '15' },
    tagText: { color: COLORS.primary, fontSize: 11 },
    website: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});

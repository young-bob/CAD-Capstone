import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Searchbar, Card, Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { opportunityService } from '../../services/opportunities';
import { OpportunityStatus } from '../../types/enums';
import { OpportunitySummary } from '../../types/opportunity';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function HomeScreen() {
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
    const { linkedGrainId } = useAuthStore();

    const fetchOpportunities = useCallback(async () => {
        try {
            if (!linkedGrainId) { setLoading(false); return; }
            const results = await opportunityService.search();
            setOpportunities(results);
        } catch (err: any) {
            console.log('Fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOpportunities();
        setRefreshing(false);
    }, [fetchOpportunities]);

    const filtered = opportunities.filter((o) =>
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.category.toLowerCase().includes(search.toLowerCase()) ||
        o.organizationName.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Loading opportunities...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search opportunities..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchbar}
                iconColor={COLORS.textSecondary}
                inputStyle={{ color: COLORS.text }}
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.opportunityId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => router.push({ pathname: '/(volunteer)/opportunity-detail', params: { id: item.opportunityId } })}>
                        <Card style={styles.card} mode="outlined">
                            <Card.Content>
                                <View style={styles.cardHeader}>
                                    <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                                    <Chip compact style={styles.chip} textStyle={styles.chipText}>{item.category}</Chip>
                                </View>
                                <Text style={styles.desc} numberOfLines={2}>By: {item.organizationName}</Text>
                                <View style={styles.meta}>
                                    <Text style={styles.metaText}>Spots: {item.availableSpots} / {item.totalSpots}</Text>
                                    <Text style={styles.metaText}>📅 {new Date(item.publishDate).toLocaleDateString()}</Text>
                                    <Text style={styles.metaText}>📊 {item.status}</Text>
                                </View>
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="magnify" size={56} color={COLORS.textSecondary} />
                        <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 }}>No Opportunities Found</Text>
                        <Text style={styles.emptyText}>No published opportunities are available right now.</Text>
                        <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', fontSize: 12, fontStyle: 'italic' }}>
                            Pull down to check for new events.
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
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { color: COLORS.text, flex: 1 },
    chip: { backgroundColor: COLORS.primary + '20' },
    chipText: { color: COLORS.primary, fontSize: 11 },
    desc: { color: COLORS.textSecondary, marginBottom: 8 },
    meta: { flexDirection: 'row', gap: 16 },
    metaText: { color: COLORS.textSecondary, fontSize: 12 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4 },
});

import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, Switch, Text as RNText } from 'react-native';
import { Searchbar, Card, Text, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { opportunityService } from '../../services/opportunities';
import { OpportunitySummary } from '../../types/opportunity';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Fixed categories matching the web app
const CATEGORIES = ['', 'Community', 'Environment', 'Education', 'Health', 'Technology'];

// Category-specific colors (matching web tag colors)
const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
    'Community': { bg: '#fff1f2', text: '#e11d48' },
    'Environment': { bg: '#ecfdf5', text: '#059669' },
    'Education': { bg: '#fffbeb', text: '#d97706' },
    'Health': { bg: '#eff6ff', text: '#2563eb' },
    'Technology': { bg: '#f5f3ff', text: '#7c3aed' },
};

// Inactive chip color per category
const CHIP_INACTIVE: Record<string, string> = {
    'Community': '#e11d48',
    'Environment': '#059669',
    'Education': '#d97706',
    'Health': '#2563eb',
    'Technology': '#7c3aed',
};

export default function HomeScreen() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [availableOnly, setAvailableOnly] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
    const { linkedGrainId } = useAuthStore();

    const fetchOpportunities = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
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
        await fetchOpportunities(true);
        setRefreshing(false);
    }, [fetchOpportunities]);

    const filtered = opportunities.filter(o => {
        const matchesSearch =
            o.title.toLowerCase().includes(search.toLowerCase()) ||
            o.category.toLowerCase().includes(search.toLowerCase()) ||
            o.organizationName.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || o.category === selectedCategory;
        const matchesAvailable = !availableOnly || o.availableSpots > 0;
        return matchesSearch && matchesCategory && matchesAvailable;
    });

    const hasActiveFilters = selectedCategory !== '' || availableOnly;

    const resetFilters = () => {
        setSearch('');
        setSelectedCategory('');
        setAvailableOnly(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 14 }}>Loading opportunities...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search bar */}
            <Searchbar
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchbar}
                iconColor={COLORS.textSecondary}
                inputStyle={{ color: COLORS.text, fontSize: 14 }}
            />

            {/* Category filter chips — fixed list matching web */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScroll}
            >
                {CATEGORIES.map(cat => {
                    const active = selectedCategory === cat;
                    const label = cat || 'All';
                    const inactiveColor = cat ? CHIP_INACTIVE[cat] : COLORS.textSecondary;
                    return (
                        <TouchableOpacity
                            key={label}
                            style={[
                                styles.filterChip,
                                active
                                    ? styles.filterChipActive
                                    : { borderColor: inactiveColor + '40', backgroundColor: COLORS.surface }
                            ]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <RNText style={[
                                styles.filterChipText,
                                active
                                    ? styles.filterChipTextActive
                                    : { color: inactiveColor }
                            ]}>
                                {label}
                            </RNText>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Available only toggle — matches web "Available spots only" filter */}
            <View style={styles.availableRow}>
                <View style={styles.availableLeft}>
                    <MaterialCommunityIcons name="account-check-outline" size={16} color={availableOnly ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.availableLabel, availableOnly && { color: COLORS.text }]}>
                        Available spots only
                    </Text>
                </View>
                <Switch
                    value={availableOnly}
                    onValueChange={setAvailableOnly}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                    thumbColor={availableOnly ? COLORS.primary : COLORS.textSecondary}
                />
            </View>

            {/* Results summary + reset */}
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{filtered.length} opportunities found</Text>
                {hasActiveFilters && (
                    <Button
                        compact
                        mode="text"
                        textColor={COLORS.primary}
                        onPress={resetFilters}
                    >
                        Reset filters
                    </Button>
                )}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.opportunityId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => {
                    const catStyle = CATEGORY_STYLE[item.category] ?? { bg: COLORS.primary + '15', text: COLORS.primary };
                    return (
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/(volunteer)/opportunity-detail', params: { id: item.opportunityId } })}
                            activeOpacity={0.85}
                        >
                            <Card style={styles.card} mode="outlined">
                                <Card.Content>
                                    {/* Header row */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.orgRow}>
                                            <MaterialCommunityIcons name="office-building-outline" size={12} color={COLORS.textSecondary} />
                                            <Text style={styles.orgName} numberOfLines={1}>{item.organizationName}</Text>
                                        </View>
                                        {/* Category tag with web-matching colors */}
                                        <View style={[styles.categoryTag, { backgroundColor: catStyle.bg }]}>
                                            <Text style={[styles.categoryTagText, { color: catStyle.text }]}>
                                                {item.category}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Title */}
                                    <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
                                        {item.title}
                                    </Text>

                                    {/* Meta row */}
                                    <View style={styles.metaRow}>
                                        <View style={styles.metaItem}>
                                            <MaterialCommunityIcons name="account-multiple-outline" size={14} color={COLORS.textSecondary} />
                                            <Text style={[
                                                styles.metaText,
                                                item.availableSpots === 0 && { color: COLORS.error }
                                            ]}>
                                                {item.availableSpots} / {item.totalSpots} spots
                                            </Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <MaterialCommunityIcons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                                            <Text style={styles.metaText}>
                                                {new Date(item.publishDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>
                                </Card.Content>
                                <Card.Actions style={styles.cardActions}>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: item.availableSpots > 0 ? COLORS.success + '15' : COLORS.error + '15' }
                                    ]}>
                                        <View style={[
                                            styles.statusDot,
                                            { backgroundColor: item.availableSpots > 0 ? COLORS.success : COLORS.error }
                                        ]} />
                                        <Text style={[
                                            styles.statusText,
                                            { color: item.availableSpots > 0 ? COLORS.success : COLORS.error }
                                        ]}>
                                            {item.availableSpots > 0 ? 'Open' : 'Full'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }} />
                                    <Text style={styles.viewDetails}>View Details →</Text>
                                </Card.Actions>
                            </Card>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="magnify-remove-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyTitle}>No Opportunities Found</Text>
                        <Text style={styles.emptyText}>
                            {hasActiveFilters || search
                                ? 'Try adjusting your search or filters.'
                                : 'No published opportunities are available right now.'}
                        </Text>
                        {(hasActiveFilters || search) && (
                            <Button compact textColor={COLORS.primary} onPress={resetFilters} style={{ marginTop: 8 }}>
                                Reset Filters
                            </Button>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    searchbar: { margin: 14, marginBottom: 6, backgroundColor: COLORS.surface, borderRadius: 10 },

    filterScroll: { flexGrow: 0, height: 48 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 2, gap: 8, alignItems: 'center' },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },

    availableRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 6,
        marginHorizontal: 16, marginBottom: 4,
        backgroundColor: COLORS.surface,
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    availableLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    availableLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },

    resultsHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 4, marginTop: 4,
    },
    resultsCount: { color: COLORS.textSecondary, fontSize: 13 },

    list: { padding: 16, paddingTop: 4 },
    card: {
        marginBottom: 12, backgroundColor: COLORS.surface,
        borderColor: COLORS.border, borderRadius: 16,
    },

    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    orgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
    orgName: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },

    categoryTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
    categoryTagText: { fontSize: 11, fontWeight: '700' },

    title: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 10 },

    metaRow: { flexDirection: 'row', gap: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: COLORS.textSecondary, fontSize: 12 },

    cardActions: { paddingTop: 0, paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    viewDetails: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 18, marginTop: 14 },
    emptyText: { color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});

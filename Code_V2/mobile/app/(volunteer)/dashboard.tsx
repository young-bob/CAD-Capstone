import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Surface, Card, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService, VolunteerProfile } from '../../services/volunteers';
import { applicationService } from '../../services/applications';
import { ApplicationSummary } from '../../types/application';
import { ApplicationStatus } from '../../types/enums';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
    return (
        <Surface style={styles.statCard} elevation={1}>
            <MaterialCommunityIcons name={icon} size={28} color={color} />
            <Text variant="headlineSmall" style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Surface>
    );
}

const STATUS_COLOR: Record<string, string> = {
    Approved: COLORS.success,
    Pending: COLORS.warning,
    Promoted: COLORS.primary,
};

export default function DashboardScreen() {
    const { linkedGrainId, email } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [upcomingApps, setUpcomingApps] = useState<ApplicationSummary[]>([]);

    const load = useCallback(async () => {
        if (!linkedGrainId) { setLoading(false); return; }
        try {
            const [p, apps] = await Promise.all([
                volunteerService.getProfile(linkedGrainId),
                applicationService.getForVolunteer(linkedGrainId),
            ]);
            setProfile(p);
            setUpcomingApps(
                apps
                    .filter(a => [ApplicationStatus.Approved, ApplicationStatus.Pending, ApplicationStatus.Promoted].includes(a.status as ApplicationStatus))
                    .sort((a, b) => {
                        if (!a.shiftStartTime) return 1;
                        if (!b.shiftStartTime) return -1;
                        return new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime();
                    })
                    .slice(0, 5)
            );
        } catch (err: any) {
            console.log('Dashboard load error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const displayName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName}`
        : email ?? 'Volunteer';

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
            {/* Greeting */}
            <Surface style={styles.greetingCard} elevation={2}>
                <View style={styles.greetingRow}>
                    <View style={{ flex: 1 }}>
                        <Text variant="headlineSmall" style={styles.greetingName}>
                            Welcome back, {displayName.split(' ')[0]}!
                        </Text>
                        <Text style={styles.greetingSubtitle}>Here's your volunteer summary</Text>
                    </View>
                    <MaterialCommunityIcons name="hand-heart" size={40} color={COLORS.primary} />
                </View>
            </Surface>

            {/* Impact Stats */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Your Impact</Text>
            <View style={styles.statsRow}>
                <StatCard
                    icon="clock-outline"
                    value={profile?.totalHours ?? 0}
                    label="Hours"
                    color={COLORS.primary}
                />
                <StatCard
                    icon="check-decagram"
                    value={profile?.completedOpportunities ?? 0}
                    label="Completed"
                    color={COLORS.success}
                />
                <StatCard
                    icon="star"
                    value={profile?.impactScore ?? 0}
                    label="Impact"
                    color={COLORS.warning}
                />
            </View>

            {/* Quick Actions */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(volunteer)/home')}>
                    <MaterialCommunityIcons name="compass" size={28} color={COLORS.primary} />
                    <Text style={styles.actionLabel}>Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(volunteer)/checkin')}>
                    <MaterialCommunityIcons name="map-marker-check" size={28} color={COLORS.success} />
                    <Text style={styles.actionLabel}>Check In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(volunteer)/organizations')}>
                    <MaterialCommunityIcons name="domain" size={28} color={COLORS.secondary} />
                    <Text style={styles.actionLabel}>Orgs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(volunteer)/attendance')}>
                    <MaterialCommunityIcons name="history" size={28} color={COLORS.warning} />
                    <Text style={styles.actionLabel}>History</Text>
                </TouchableOpacity>
            </View>

            {/* Upcoming Schedule */}
            <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Upcoming Schedule</Text>
                <Button compact textColor={COLORS.primary} onPress={() => router.push('/(volunteer)/my-applications')}>
                    View All
                </Button>
            </View>

            {upcomingApps.length === 0 ? (
                <Card style={styles.emptyCard} mode="outlined">
                    <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialCommunityIcons name="calendar-blank" size={40} color={COLORS.textSecondary} />
                        <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>No upcoming events</Text>
                        <Button compact textColor={COLORS.primary} onPress={() => router.push('/(volunteer)/home')} style={{ marginTop: 8 }}>
                            Browse Opportunities
                        </Button>
                    </Card.Content>
                </Card>
            ) : (
                upcomingApps.map(app => (
                    <Card key={app.applicationId} style={styles.appCard} mode="outlined">
                        <Card.Content>
                            {app.organizationName ? (
                                <View style={styles.orgRow}>
                                    <MaterialCommunityIcons name="office-building-outline" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.orgName}>{app.organizationName}</Text>
                                </View>
                            ) : null}
                            <Text style={styles.appTitle} numberOfLines={1}>{app.opportunityTitle}</Text>
                            {app.shiftName ? <Text style={styles.shiftName}>{app.shiftName}</Text> : null}
                            {app.shiftStartTime ? (
                                <View style={styles.timeRow}>
                                    <MaterialCommunityIcons name="calendar-clock" size={13} color={COLORS.textSecondary} />
                                    <Text style={styles.timeText}>
                                        {new Date(app.shiftStartTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                        {' · '}
                                        {new Date(app.shiftStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ) : null}
                            <Chip
                                compact
                                style={[styles.chip, { backgroundColor: (STATUS_COLOR[app.status] ?? COLORS.textSecondary) + '20' }]}
                                textStyle={{ color: STATUS_COLOR[app.status] ?? COLORS.textSecondary, fontSize: 11 }}
                            >
                                {app.status}
                            </Chip>
                        </Card.Content>
                    </Card>
                ))
            )}

            {/* Credentials Reminder */}
            {profile && profile.credentials.length === 0 && (
                <Card style={styles.reminderCard} mode="outlined">
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <MaterialCommunityIcons name="shield-alert-outline" size={28} color={COLORS.warning} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Upload your credentials</Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                                Add certifications to qualify for more opportunities.
                            </Text>
                        </View>
                        <Button compact textColor={COLORS.primary} onPress={() => router.push('/(volunteer)/profile')}>
                            Go
                        </Button>
                    </Card.Content>
                </Card>
            )}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    greetingCard: {
        padding: 20, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 20,
    },
    greetingRow: { flexDirection: 'row', alignItems: 'center' },
    greetingName: { color: COLORS.text, fontWeight: 'bold' },
    greetingSubtitle: { color: COLORS.textSecondary, marginTop: 4 },
    sectionTitle: { color: COLORS.text, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: COLORS.surface },
    statValue: { marginTop: 6, fontWeight: 'bold' },
    statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
    actionsRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20,
    },
    actionBtn: { alignItems: 'center', flex: 1 },
    actionLabel: { color: COLORS.text, fontSize: 12, marginTop: 6, fontWeight: '600' },
    emptyCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    appCard: { marginBottom: 10, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12 },
    orgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    orgName: { color: COLORS.textSecondary, fontSize: 11 },
    appTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
    shiftName: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 8 },
    timeText: { color: COLORS.textSecondary, fontSize: 12 },
    chip: { alignSelf: 'flex-start' },
    reminderCard: { marginTop: 8, backgroundColor: COLORS.surface, borderColor: COLORS.warning + '60', borderRadius: 12 },
});

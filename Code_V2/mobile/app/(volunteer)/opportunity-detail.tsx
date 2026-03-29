import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, Button, Surface, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { skillService, Skill } from '../../services/skills';
import { OpportunityState, Shift } from '../../types/opportunity';
import { ApplicationStatus, OpportunityStatus } from '../../types/enums';
import { ApplicationSummary } from '../../types/application';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OpportunityDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [opp, setOpp] = useState<OpportunityState | null>(null);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [applying, setApplying] = useState<string | null>(null);
    const [skillMap, setSkillMap] = useState<Record<string, string>>({});

    const fetchOpp = useCallback(async () => {
        try {
            if (!id || !linkedGrainId) return;
            const [data, userApps, allSkills] = await Promise.all([
                opportunityService.getById(id),
                applicationService.getForVolunteer(linkedGrainId),
                skillService.getAll(),
            ]);
            setOpp(data);
            setApplications(userApps.filter(a => a.opportunityId === id));
            const map: Record<string, string> = {};
            allSkills.forEach((s: Skill) => { map[s.id] = s.name; });
            setSkillMap(map);
        } catch {
            Alert.alert('Error', 'Failed to load opportunity');
        } finally {
            setLoading(false);
        }
    }, [id, linkedGrainId]);

    useEffect(() => { fetchOpp(); }, [fetchOpp]);

    const handleApply = (shift: Shift) => {
        if (!id || !linkedGrainId) return;
        Alert.alert(
            'Apply to Shift',
            `Apply for "${shift.name}" on ${new Date(shift.startTime).toLocaleDateString()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Apply', onPress: async () => {
                        setApplying(shift.shiftId);
                        try {
                            const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                            await opportunityService.apply(id, {
                                volunteerId: linkedGrainId,
                                shiftId: shift.shiftId,
                                idempotencyKey: key,
                            });
                            Alert.alert('Applied! ✅', 'Your application has been submitted. The coordinator will review it.');
                            await fetchOpp();
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.toString() || 'Failed to apply');
                        } finally {
                            setApplying(null);
                        }
                    }
                },
            ]
        );
    };

    const handleWithdraw = (appId: string, shiftId: string) => {
        if (!id) return;
        Alert.alert(
            'Withdraw Application',
            'Are you sure you want to withdraw? You can re-apply later if spots are still available.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Withdraw', style: 'destructive', onPress: async () => {
                        setApplying(shiftId);
                        try {
                            await opportunityService.withdrawApplication(id, appId);
                            Alert.alert('Withdrawn', 'Your application has been withdrawn.');
                            await fetchOpp();
                        } catch {
                            Alert.alert('Error', 'Failed to withdraw application');
                        } finally {
                            setApplying(null);
                        }
                    }
                },
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

    if (!opp) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: COLORS.textSecondary }}>Opportunity not found</Text>
            </View>
        );
    }

    const isConfirmed = linkedGrainId ? opp.confirmedVolunteerIds.includes(linkedGrainId) : false;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <Surface style={styles.header} elevation={2}>
                <Text variant="headlineSmall" style={styles.title}>{opp.info.title}</Text>
                <View style={styles.chipRow}>
                    <Chip compact icon="tag" style={styles.catChip} textStyle={{ color: COLORS.primary, fontSize: 11 }}>{opp.info.category}</Chip>
                    <Chip compact style={{ backgroundColor: COLORS.success + '20' }} textStyle={{ color: COLORS.success, fontSize: 11 }}>{opp.status}</Chip>
                </View>
                <Text style={styles.desc}>{opp.info.description}</Text>

                {opp.info.tags.length > 0 && (
                    <View style={styles.chipRow}>
                        {opp.info.tags.map((tag, i) => (
                            <Chip key={i} compact style={styles.tagChip} textStyle={{ color: COLORS.textSecondary, fontSize: 10 }}>{tag}</Chip>
                        ))}
                    </View>
                )}

                {isConfirmed && (
                    <View style={styles.confirmedBanner}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                        <Text style={{ color: COLORS.success, marginLeft: 8 }}>You are confirmed for this event!</Text>
                    </View>
                )}
            </Surface>

            {/* Stats */}
            <View style={styles.statsRow}>
                <Surface style={styles.statCard} elevation={1}>
                    <Text variant="titleLarge" style={{ color: COLORS.primary }}>{opp.shifts.length}</Text>
                    <Text style={styles.statLabel}>Shifts</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                    <Text variant="titleLarge" style={{ color: COLORS.success }}>{opp.confirmedVolunteerIds.length}</Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                    <Text variant="titleLarge" style={{ color: COLORS.warning }}>{opp.waitlistQueue.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </Surface>
            </View>

            {/* Shifts */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Available Shifts</Text>
            {opp.shifts.length === 0 ? (
                <Card style={styles.shiftCard} mode="outlined">
                    <Card.Content>
                        <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>No shifts available yet</Text>
                    </Card.Content>
                </Card>
            ) : (
                opp.shifts.map((shift) => {
                    const isFull = shift.currentCount >= shift.maxCapacity;
                    const shiftApp = applications.find(a => a.shiftId === shift.shiftId);
                    const isPending = shiftApp?.status === ApplicationStatus.Pending;
                    const isApproved = shiftApp?.status === ApplicationStatus.Approved || shiftApp?.status === ApplicationStatus.Promoted;

                    return (
                        <Card key={shift.shiftId} style={styles.shiftCard} mode="outlined">
                            <Card.Content>
                                <View style={styles.shiftHeader}>
                                    <Text variant="titleSmall" style={{ color: COLORS.text, flex: 1 }}>{shift.name}</Text>
                                    <Chip compact style={{ backgroundColor: isFull ? COLORS.error + '20' : COLORS.success + '20' }}
                                        textStyle={{ color: isFull ? COLORS.error : COLORS.success, fontSize: 10 }}>
                                        {shift.currentCount}/{shift.maxCapacity}
                                    </Chip>
                                </View>
                                <Text style={styles.shiftTime}>
                                    📅 {new Date(shift.startTime).toLocaleDateString()} {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={styles.shiftTime}>
                                    🏁 {new Date(shift.endTime).toLocaleDateString()} {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </Card.Content>

                            {/* Actions area per shift */}
                            <Card.Actions>
                                {isPending && shiftApp && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                                        <Text style={{ color: COLORS.warning, flex: 1, fontSize: 13, paddingLeft: 8 }}>Application pending...</Text>
                                        <Button mode="outlined" textColor={COLORS.error} compact
                                            loading={applying === shift.shiftId}
                                            onPress={() => handleWithdraw(shiftApp.applicationId, shift.shiftId)}>Withdraw</Button>
                                    </View>
                                )}

                                {isApproved && (
                                    <Text style={{ color: COLORS.success, padding: 8, textAlign: 'right', width: '100%' }}>You are scheduled for this shift!</Text>
                                )}

                                {opp.status === OpportunityStatus.Published && !shiftApp && !isFull && (
                                    <Button mode="contained" buttonColor={COLORS.primary} compact
                                        loading={applying === shift.shiftId} style={{ marginLeft: 'auto' }}
                                        icon="hand-heart"
                                        onPress={() => handleApply(shift)}>Apply for this Shift</Button>
                                )}

                                {opp.status === OpportunityStatus.Published && !shiftApp && isFull && (
                                    <Text style={{ color: COLORS.textSecondary, padding: 8, textAlign: 'right', width: '100%', fontStyle: 'italic' }}>
                                        This shift is full
                                    </Text>
                                )}
                            </Card.Actions>
                        </Card>
                    );
                })
            )}

            {/* Required Skills */}
            {opp.requiredSkillIds.length > 0 && (
                <>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Required Skills</Text>
                    <View style={styles.chipRow}>
                        {opp.requiredSkillIds.map((skillId: string, i: number) => (
                            <Chip key={i} compact style={styles.tagChip} textStyle={{ color: COLORS.warning, fontSize: 11 }}>
                                {skillMap[skillId] ?? skillId}
                            </Chip>
                        ))}
                    </View>
                </>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { padding: 20, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    title: { color: COLORS.text, marginBottom: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    catChip: { backgroundColor: COLORS.primary + '20' },
    tagChip: { backgroundColor: COLORS.surfaceLight },
    desc: { color: COLORS.textSecondary, lineHeight: 22, marginBottom: 12 },
    confirmedBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.success + '15', borderRadius: 8, marginTop: 8 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: COLORS.surface },
    statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
    sectionTitle: { color: COLORS.text, marginBottom: 12 },
    shiftCard: { marginBottom: 8, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    shiftHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    shiftTime: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});

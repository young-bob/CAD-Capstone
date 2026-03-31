import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, TextInput, Button, Card, Surface, ActivityIndicator, Divider } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { adminService } from '../../services/admin';
import { attendanceService, DisputeSummary } from '../../services/attendance';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DisputesScreen() {
    const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Resolution state map
    const [resolutions, setResolutions] = useState<{ [id: string]: string }>({});
    const [adjustedHoursMap, setAdjustedHoursMap] = useState<{ [id: string]: string }>({});
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchDisputes = useCallback(async () => {
        try {
            const data = await attendanceService.getPendingDisputes();
            setDisputes(data);
        } catch (err: any) {
            console.error('Fetch disputes error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDisputes();
    }, [fetchDisputes]);

    const handleResolve = async (attendanceId: string) => {
        const resolutionText = resolutions[attendanceId] || '';
        const adjustedHours = parseFloat(adjustedHoursMap[attendanceId]) || 0;

        if (!resolutionText.trim()) {
            Alert.alert('Required', 'Please enter a resolution description.');
            return;
        }

        setActionLoadingId(attendanceId);
        try {
            await adminService.resolveDispute(attendanceId, {
                resolution: resolutionText,
                adjustedHours: adjustedHours,
            });
            Alert.alert('Success', 'Dispute resolved!');
            fetchDisputes();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to resolve');
        } finally {
            setActionLoadingId(null);
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
                <MaterialCommunityIcons name="gavel" size={48} color={COLORS.warning} />
                <Text variant="headlineSmall" style={{ color: COLORS.text, marginTop: 8 }}>Pending Disputes</Text>
            </Surface>

            {disputes.length === 0 ? (
                <Card style={styles.emptyCard} mode="outlined">
                    <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                        <MaterialCommunityIcons name="check-circle-outline" size={48} color={COLORS.success} />
                        <Text style={{ color: COLORS.textSecondary, marginTop: 16 }}>No pending disputes to resolve!</Text>
                    </Card.Content>
                </Card>
            ) : (
                disputes.map(dispute => (
                    <Card key={dispute.attendanceId} style={styles.card} mode="outlined">
                        <Card.Content>
                            <Text style={styles.cardTitle}>{dispute.opportunityTitle}</Text>
                            <Text style={styles.cardSubTitle}>Volunteer: {dispute.volunteerName}</Text>
                            <Text style={styles.cardMeta}>Raised: {new Date(dispute.raisedAt).toLocaleString()}</Text>

                            <Surface style={styles.reasonBox}>
                                <Text style={{ color: COLORS.error, fontWeight: 'bold', marginBottom: 4 }}>Dispute Reason:</Text>
                                <Text style={{ color: COLORS.text }}>{dispute.reason}</Text>
                                {dispute.evidenceUrl ? (
                                    <Text style={{ color: COLORS.primary, marginTop: 8 }}>📎 Evidence Provided: {dispute.evidenceUrl}</Text>
                                ) : null}
                            </Surface>

                            <Divider style={{ marginVertical: 12, backgroundColor: COLORS.border }} />

                            <Text style={{ color: COLORS.text, marginBottom: 8, fontWeight: 'bold' }}>Resolution</Text>

                            <TextInput
                                label="Resolution notes..."
                                value={resolutions[dispute.attendanceId] || ''}
                                onChangeText={(text) => setResolutions(prev => ({ ...prev, [dispute.attendanceId]: text }))}
                                mode="outlined"
                                multiline
                                style={styles.input}
                                outlineColor={COLORS.border}
                                activeOutlineColor={COLORS.primary}
                                textColor={COLORS.text}
                            />

                            <TextInput
                                label="Adjusted Hours (Optional)"
                                value={adjustedHoursMap[dispute.attendanceId] || ''}
                                onChangeText={(text) => setAdjustedHoursMap(prev => ({ ...prev, [dispute.attendanceId]: text }))}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { height: 40 }]}
                                outlineColor={COLORS.border}
                                activeOutlineColor={COLORS.primary}
                                textColor={COLORS.text}
                                placeholder="e.g. 4.5"
                                placeholderTextColor={COLORS.textSecondary}
                            />

                            <Button
                                mode="contained"
                                onPress={() => handleResolve(dispute.attendanceId)}
                                loading={actionLoadingId === dispute.attendanceId}
                                disabled={!!actionLoadingId}
                                buttonColor={COLORS.primary}
                                style={{ marginTop: 8 }}
                            >
                                Finalize Resolution
                            </Button>
                        </Card.Content>
                    </Card>
                ))
            )}

            <View style={{ marginTop: 24, marginBottom: 40 }}>
                {/* Manual Attendance Adjustment Section (Developer Tool) */}
                <ManualAdjustSection />
            </View>
        </ScrollView>
    );
}

function ManualAdjustSection() {
    const [attId, setAttId] = useState('');
    const [coordId, setCoordId] = useState('');
    const [newIn, setNewIn] = useState('');
    const [newOut, setNewOut] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleAdjust = async () => {
        if (!attId || !newIn || !newOut || !reason) return;
        setLoading(true);
        try {
            await attendanceService.manualAdjust(attId, {
                coordinatorId: coordId || '00000000-0000-0000-0000-000000000000',
                newCheckIn: new Date(newIn).toISOString(),
                newCheckOut: new Date(newOut).toISOString(),
                reason,
            });
            Alert.alert('Success', 'Attendance adjusted!');
            setAttId(''); setCoordId(''); setNewIn(''); setNewOut(''); setReason('');
            setExpanded(false);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to adjust');
        } finally {
            setLoading(false);
        }
    };

    if (!expanded) {
        return (
            <Button mode="text" onPress={() => setExpanded(true)} textColor={COLORS.textSecondary} icon="chevron-down">
                Show Advanced Manual Tools
            </Button>
        );
    }

    return (
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Manual Attendance Override</Text>
                    <Button icon="close" mode="text" compact onPress={() => setExpanded(false)} textColor={COLORS.textSecondary}>Close</Button>
                </View>
                <Text style={styles.hint}>
                    Developer/Emergency tool to manually adjust any check-in/check-out time bypassing the normal dispute process.
                </Text>
                <TextInput label="Attendance Record ID" value={attId} onChangeText={setAttId}
                    mode="outlined" style={[styles.input, { height: 40 }]}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                <TextInput label="Coordinator ID (optional)" value={coordId} onChangeText={setCoordId}
                    mode="outlined" style={[styles.input, { height: 40 }]}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                <TextInput label="New Check-In (YYYY-MM-DD HH:mm)" value={newIn} onChangeText={setNewIn}
                    mode="outlined" style={[styles.input, { height: 40 }]} placeholder="2026-02-28 09:00"
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text}
                    placeholderTextColor={COLORS.textSecondary} />
                <TextInput label="New Check-Out (YYYY-MM-DD HH:mm)" value={newOut} onChangeText={setNewOut}
                    mode="outlined" style={[styles.input, { height: 40 }]} placeholder="2026-02-28 17:00"
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text}
                    placeholderTextColor={COLORS.textSecondary} />
                <TextInput label="Reason" value={reason} onChangeText={setReason}
                    mode="outlined" multiline style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                <Button mode="contained" onPress={handleAdjust} loading={loading}
                    disabled={!attId || !newIn || !newOut || !reason || loading}
                    buttonColor={COLORS.secondary} style={{ marginTop: 8 }}>
                    Force Adjust Attendance
                </Button>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    emptyCard: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, marginBottom: 16 },
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, marginBottom: 16 },
    cardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    cardSubTitle: { color: COLORS.primary, fontWeight: '500', marginBottom: 4 },
    cardMeta: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 16 },
    reasonBox: { backgroundColor: '#FFEBEE10', padding: 12, borderRadius: 8, borderColor: COLORS.error + '40', borderWidth: 1 },
    sectionTitle: { color: COLORS.text, marginBottom: 4, fontWeight: 'bold' },
    hint: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 16, lineHeight: 18 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

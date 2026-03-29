import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, Button, Surface, FAB, Portal, Modal, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '../../../constants/config';
import { opportunityService } from '../../../services/opportunities';
import { applicationService } from '../../../services/applications';
import { attendanceService } from '../../../services/attendance';
import { skillService, Skill } from '../../../services/skills';
import { certificateService, CertificateTemplate } from '../../../services/certificates';
import { OpportunityState, Shift } from '../../../types/opportunity';
import { ApplicationSummary } from '../../../types/application';
import { OpportunityStatus, ApplicationStatus } from '../../../types/enums';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, string> = {
    [OpportunityStatus.Draft]: COLORS.textSecondary,
    [OpportunityStatus.Published]: COLORS.success,
    [OpportunityStatus.InProgress]: COLORS.primary,
    [OpportunityStatus.Completed]: '#4CAF50',
    [OpportunityStatus.Cancelled]: COLORS.error,
};

export default function OpportunityDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [opp, setOpp] = useState<OpportunityState | null>(null);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [showAddShift, setShowAddShift] = useState(false);
    const [shiftName, setShiftName] = useState('');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [shiftCapacity, setShiftCapacity] = useState('10');
    const [actionLoading, setActionLoading] = useState(false);

    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    const [showSkills, setShowSkills] = useState(false);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
    const [savingSkills, setSavingSkills] = useState(false);

    const [showIssueCert, setShowIssueCert] = useState(false);
    const [certTemplates, setCertTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [certTargetVolunteerId, setCertTargetVolunteerId] = useState<string | null>(null);
    const [certTargetName, setCertTargetName] = useState<string>('');
    const [issuingCert, setIssuingCert] = useState(false);

    const fetchOpp = useCallback(async () => {
        try {
            if (!id) return;
            const data = await opportunityService.getById(id);
            setOpp(data);
            const apps = await applicationService.getForOpportunity(id);
            setApplications(apps);
        } catch (err: any) {
            Alert.alert('Error', 'Failed to load opportunity');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOpp(); }, [fetchOpp]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOpp();
        setRefreshing(false);
    }, [fetchOpp]);

    const handlePublish = async () => {
        if (!id) return;
        setActionLoading(true);
        try {
            await opportunityService.publish(id);
            Alert.alert('Success', 'Opportunity published!');
            await fetchOpp();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to publish');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = () => {
        setCancelReason('');
        setShowCancel(true);
    };

    const handleCancelSubmit = async () => {
        if (!id || !cancelReason) return;
        setCancelling(true);
        try {
            await opportunityService.cancel(id, cancelReason);
            setShowCancel(false);
            Alert.alert('Done', 'Opportunity cancelled');
            await fetchOpp();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to cancel');
        } finally {
            setCancelling(false);
        }
    };

    const handleAddShift = async () => {
        if (!shiftName || !shiftStart || !shiftEnd || !id) return;
        setActionLoading(true);
        try {
            await opportunityService.addShift(id, {
                name: shiftName,
                startTime: new Date(shiftStart).toISOString(),
                endTime: new Date(shiftEnd).toISOString(),
                maxCapacity: parseInt(shiftCapacity) || 10,
            });
            setShowAddShift(false);
            setShiftName(''); setShiftStart(''); setShiftEnd(''); setShiftCapacity('10');
            Alert.alert('Success', 'Shift added!');
            await fetchOpp();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to add shift');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveApp = async (appId: string) => {
        try {
            await applicationService.approve(appId);
            Alert.alert('Approved', 'Volunteer approved!');
            await fetchOpp();
        } catch { Alert.alert('Error', 'Failed to approve'); }
    };

    const handleRejectApp = async (appId: string) => {
        try {
            await applicationService.reject(appId, 'Rejected by organization');
            Alert.alert('Rejected', 'Application rejected');
            await fetchOpp();
        } catch { Alert.alert('Error', 'Failed to reject'); }
    };

    const openSkillsModal = async () => {
        try {
            const list = await skillService.getAll();
            setAllSkills(list);
            setSelectedSkillIds(new Set(opp?.requiredSkillIds || []));
            setShowSkills(true);
        } catch { Alert.alert('Error', 'Failed to load skills'); }
    };

    const handleSaveSkills = async () => {
        if (!id) return;
        setSavingSkills(true);
        try {
            await skillService.setRequiredSkills(id, Array.from(selectedSkillIds));
            setShowSkills(false);
            Alert.alert('Success', 'Required skills updated');
            await fetchOpp();
        } catch { Alert.alert('Error', 'Failed to save skills'); }
        finally { setSavingSkills(false); }
    };

    const toggleSkill = (skillId: string) => {
        setSelectedSkillIds(prev => {
            const next = new Set(prev);
            if (next.has(skillId)) next.delete(skillId);
            else next.add(skillId);
            return next;
        });
    };

    const openIssueCert = async (volunteerId: string, volunteerName: string) => {
        try {
            const list = await certificateService.getTemplates();
            setCertTemplates(list);
            setSelectedTemplateId(list.length > 0 ? list[0].id : null);
            setCertTargetVolunteerId(volunteerId);
            setCertTargetName(volunteerName);
            setShowIssueCert(true);
        } catch { Alert.alert('Error', 'Failed to load certificate templates'); }
    };

    const handleIssueCert = async () => {
        if (!certTargetVolunteerId || !selectedTemplateId) return;
        setIssuingCert(true);
        try {
            const result = await certificateService.generate(certTargetVolunteerId, selectedTemplateId);
            setShowIssueCert(false);
            Alert.alert('Certificate Issued!', `Certificate generated for ${certTargetName}.\n\nDownload URL:\n${result.downloadUrl}`);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to generate certificate');
        } finally {
            setIssuingCert(false);
        }
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

    const pendingApps = applications.filter(a => a.status === ApplicationStatus.Pending);
    const confirmedApps = applications.filter(a => a.status === ApplicationStatus.Promoted || a.status === ApplicationStatus.Approved);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Header */}
                <Surface style={styles.header} elevation={2}>
                    <View style={styles.titleRow}>
                        <Text variant="headlineSmall" style={styles.title}>{opp.info.title}</Text>
                        <Chip compact style={{ backgroundColor: (STATUS_COLORS[opp.status] || COLORS.textSecondary) + '20' }}
                            textStyle={{ color: STATUS_COLORS[opp.status], fontSize: 12 }}>{opp.status}</Chip>
                    </View>
                    <Chip compact icon="tag" style={styles.categoryChip} textStyle={{ color: COLORS.primary, fontSize: 11 }}>{opp.info.category}</Chip>
                    <Text style={styles.desc}>{opp.info.description}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.statText}>{opp.shifts.length} shifts</Text>
                        </View>
                        <View style={styles.stat}>
                            <MaterialCommunityIcons name="account-check" size={18} color={COLORS.success} />
                            <Text style={styles.statText}>{opp.confirmedVolunteerIds.length} confirmed</Text>
                        </View>
                        <View style={styles.stat}>
                            <MaterialCommunityIcons name="account-clock" size={18} color={COLORS.warning} />
                            <Text style={styles.statText}>{opp.waitlistQueue.length} pending</Text>
                        </View>
                        <View style={styles.stat}>
                            <MaterialCommunityIcons name="star-circle-outline" size={18} color={COLORS.secondary} />
                            <Text style={styles.statText}>{opp.requiredSkillIds?.length || 0} skills</Text>
                        </View>
                    </View>
                </Surface>

                {/* Actions */}
                <View style={styles.actions}>
                    {opp.status === OpportunityStatus.Draft && (
                        <Button mode="contained" buttonColor={COLORS.success} onPress={handlePublish}
                            loading={actionLoading} icon="publish" style={styles.actionBtn}>Publish</Button>
                    )}
                    {(opp.status === OpportunityStatus.Draft || opp.status === OpportunityStatus.Published) && (
                        <Button mode="outlined" textColor={COLORS.error} onPress={handleCancel}
                            icon="cancel" style={styles.actionBtn}>Cancel</Button>
                    )}
                    <Button mode="outlined" onPress={openSkillsModal} icon="star-plus" style={styles.actionBtn}>Skills</Button>
                </View>

                {/* Shifts */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Shifts</Text>
                {opp.shifts.length === 0 ? (
                    <Card style={styles.emptyCard} mode="outlined">
                        <Card.Content>
                            <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
                                No shifts yet. Add shifts before publishing.
                            </Text>
                        </Card.Content>
                    </Card>
                ) : (
                    opp.shifts.map((shift, i) => (
                        <Card key={shift.shiftId || i} style={styles.shiftCard} mode="outlined">
                            <Card.Content>
                                <Text variant="titleSmall" style={{ color: COLORS.text }}>{shift.name}</Text>
                                <Text style={styles.shiftMeta}>
                                    📅 {new Date(shift.startTime).toLocaleString()} — {new Date(shift.endTime).toLocaleString()}
                                </Text>
                                <Text style={styles.shiftMeta}>👥 {shift.currentCount}/{shift.maxCapacity} volunteers</Text>
                            </Card.Content>
                        </Card>
                    ))
                )}

                <Button mode="outlined" icon="plus" textColor={COLORS.primary} style={{ marginTop: 8, marginBottom: 16 }}
                    onPress={() => setShowAddShift(true)}>Add Shift</Button>

                {/* Waitlist / Pending Applications */}
                {pendingApps.length > 0 && (
                    <>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Pending Applications</Text>
                        {pendingApps.map((app) => (
                            <Card key={app.applicationId} style={styles.appCard} mode="outlined">
                                <Card.Content style={styles.appRow}>
                                    <Text style={{ color: COLORS.text, flex: 1, fontSize: 13 }}>{app.volunteerName || app.volunteerId.substring(0, 12)}</Text>
                                    <Button compact mode="contained" buttonColor={COLORS.success} onPress={() => handleApproveApp(app.applicationId)}
                                        style={{ marginRight: 8 }}>Approve</Button>
                                    <Button compact mode="outlined" textColor={COLORS.error} onPress={() => handleRejectApp(app.applicationId)}>Reject</Button>
                                </Card.Content>
                            </Card>
                        ))}
                    </>
                )}

                {/* Confirmed Volunteers */}
                {confirmedApps.length > 0 && (
                    <>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Confirmed Volunteers</Text>
                        {confirmedApps.map((app) => (
                            <Card key={app.applicationId} style={styles.appCard} mode="outlined">
                                <Card.Content style={styles.appRow}>
                                    <Text style={{ color: COLORS.text, flex: 1, fontSize: 13 }}>{app.volunteerName || app.volunteerId.substring(0, 12)} ({app.shiftName})</Text>
                                </Card.Content>
                                <Card.Actions>
                                    <Button compact textColor={COLORS.error}
                                        onPress={async () => {
                                            try {
                                                await applicationService.markNoShow(app.applicationId);
                                                Alert.alert('Done', 'Marked as no-show');
                                                await fetchOpp();
                                            } catch { Alert.alert('Error', 'Failed to mark no-show'); }
                                        }}>No-Show</Button>
                                    <Button compact textColor={COLORS.success}
                                        onPress={async () => {
                                            try {
                                                await attendanceService.confirm(app.volunteerId, { supervisorId: id || '', rating: 5 });
                                                Alert.alert('Done', 'Attendance confirmed');
                                            } catch { Alert.alert('Error', 'Failed to confirm'); }
                                        }}>Confirm</Button>
                                    <Button compact icon="certificate" textColor={COLORS.primary}
                                        onPress={() => openIssueCert(app.volunteerId, app.volunteerName || app.volunteerId)}>
                                        Certificate
                                    </Button>
                                </Card.Actions>
                            </Card>
                        ))}
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Add Shift Modal */}
            <Portal>
                <Modal visible={showAddShift} onDismiss={() => setShowAddShift(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Add Shift</Text>
                    <TextInput label="Shift Name" value={shiftName} onChangeText={setShiftName} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Start (YYYY-MM-DD HH:MM)" value={shiftStart} onChangeText={setShiftStart} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text}
                        placeholder="2026-03-15 09:00" placeholderTextColor={COLORS.textSecondary} />
                    <TextInput label="End (YYYY-MM-DD HH:MM)" value={shiftEnd} onChangeText={setShiftEnd} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text}
                        placeholder="2026-03-15 17:00" placeholderTextColor={COLORS.textSecondary} />
                    <TextInput label="Max Capacity" value={shiftCapacity} onChangeText={setShiftCapacity} mode="outlined"
                        keyboardType="numeric" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleAddShift} loading={actionLoading} disabled={!shiftName || !shiftStart || !shiftEnd}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Add Shift</Button>
                </Modal>

                <Modal visible={showCancel} onDismiss={() => setShowCancel(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Cancel Event</Text>
                    <TextInput label="Reason (required)" value={cancelReason} onChangeText={setCancelReason} mode="outlined" multiline
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.error} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleCancelSubmit} loading={cancelling} disabled={!cancelReason || cancelling}
                        buttonColor={COLORS.error} style={{ marginTop: 8 }}>Confirm Cancel</Button>
                    <Button onPress={() => setShowCancel(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Back</Button>
                </Modal>

                <Modal visible={showSkills} onDismiss={() => setShowSkills(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Required Skills</Text>
                    <ScrollView style={{ maxHeight: 300 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {allSkills.map(s => (
                                <Chip key={s.id}
                                    selected={selectedSkillIds.has(s.id)}
                                    style={{ backgroundColor: selectedSkillIds.has(s.id) ? COLORS.primary : COLORS.surfaceLight }}
                                    textStyle={{ color: selectedSkillIds.has(s.id) ? '#fff' : COLORS.text }}
                                    onPress={() => toggleSkill(s.id)}>
                                    {s.name}
                                </Chip>
                            ))}
                            {allSkills.length === 0 && <Text style={{ color: COLORS.textSecondary }}>No skills defined in system.</Text>}
                        </View>
                    </ScrollView>
                    <Button mode="contained" onPress={handleSaveSkills} loading={savingSkills} disabled={savingSkills}
                        buttonColor={COLORS.primary} style={{ marginTop: 16 }}>Save Skills</Button>
                    <Button onPress={() => setShowSkills(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Cancel</Button>
                </Modal>

                <Modal visible={showIssueCert} onDismiss={() => setShowIssueCert(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 8 }}>Issue Certificate</Text>
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 16 }}>Issuing to: {certTargetName}</Text>
                    <Text style={{ color: COLORS.text, marginBottom: 8, fontWeight: 'bold' }}>Select Template:</Text>
                    <ScrollView style={{ maxHeight: 250 }}>
                        {certTemplates.map(t => (
                            <Card key={t.id} mode="outlined" style={[
                                { marginBottom: 8, backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border },
                                selectedTemplateId === t.id && { borderColor: COLORS.primary, borderWidth: 2 }
                            ]} onPress={() => setSelectedTemplateId(t.id)}>
                                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.primaryColor }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{t.name}</Text>
                                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{t.description}</Text>
                                    </View>
                                    {selectedTemplateId === t.id && <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />}
                                </Card.Content>
                            </Card>
                        ))}
                        {certTemplates.length === 0 && <Text style={{ color: COLORS.textSecondary }}>No templates available. Create one in the Certificates tab first.</Text>}
                    </ScrollView>
                    <Button mode="contained" onPress={handleIssueCert} loading={issuingCert}
                        disabled={!selectedTemplateId || issuingCert || certTemplates.length === 0}
                        buttonColor={COLORS.primary} style={{ marginTop: 16 }}>Issue Certificate</Button>
                    <Button onPress={() => setShowIssueCert(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Cancel</Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { padding: 20, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { color: COLORS.text, flex: 1, marginRight: 8 },
    categoryChip: { backgroundColor: COLORS.primary + '20', alignSelf: 'flex-start', marginBottom: 12 },
    desc: { color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 20 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { color: COLORS.textSecondary, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    actionBtn: { flex: 1 },
    sectionTitle: { color: COLORS.text, marginBottom: 12, marginTop: 8 },
    shiftCard: { marginBottom: 8, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    shiftMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    appCard: { marginBottom: 8, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    appRow: { flexDirection: 'row', alignItems: 'center' },
    emptyCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, marginBottom: 8 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

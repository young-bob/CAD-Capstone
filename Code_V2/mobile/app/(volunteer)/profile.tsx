import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Switch, Linking } from 'react-native';
import { Avatar, Button, Card, Text, Surface, Divider, ActivityIndicator, Portal, Modal, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService, VolunteerProfile } from '../../services/volunteers';
import { certificateService, CertificateTemplate } from '../../services/certificates';
import { fileService } from '../../services/files';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProfileScreen() {
    const { email, role, linkedGrainId, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editFirst, setEditFirst] = useState('');
    const [editLast, setEditLast] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editBio, setEditBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCredential, setShowCredential] = useState(false);
    const [credUrl, setCredUrl] = useState('');
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [privPublic, setPrivPublic] = useState(true);
    const [privEmail, setPrivEmail] = useState(true);
    const [privPush, setPrivPush] = useState(true);
    // Certificate state
    const [showCert, setShowCert] = useState(false);
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [certLoading, setCertLoading] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const data = await volunteerService.getProfile(linkedGrainId);
            setProfile(data);
        } catch (err: any) {
            console.log('Profile fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProfile();
        setRefreshing(false);
    }, [fetchProfile]);

    const openEdit = () => {
        setEditFirst(profile?.firstName || '');
        setEditLast(profile?.lastName || '');
        setEditPhone(profile?.phone || '');
        setEditBio(profile?.bio || '');
        setShowEdit(true);
    };

    const handleSaveProfile = async () => {
        if (!linkedGrainId) return;
        setSaving(true);
        try {
            await volunteerService.updateProfile(linkedGrainId, {
                firstName: editFirst,
                lastName: editLast,
                email: email || '',
                phone: editPhone,
                bio: editBio,
            });
            setShowEdit(false);
            Alert.alert('Success', 'Profile updated!');
            await fetchProfile();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadCredential = async () => {
        if (!linkedGrainId) return;
        try {
            const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = await import('expo-image-picker');
            const { status } = await requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Media library permission is required.');
                return;
            }
            const result = await launchImageLibraryAsync({ quality: 0.7 });
            if (result.canceled) return;
            const asset = result.assets[0];
            const name = asset.fileName || `credential_${Date.now()}.jpg`;
            const fileKey = await fileService.upload(asset.uri, name, 'credentials');
            await volunteerService.uploadCredential(linkedGrainId, fileKey);
            setShowCredential(false);
            Alert.alert('Success', 'Credential uploaded!');
            await fetchProfile();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to upload');
        }
    };

    const handleOpenCertModal = async () => {
        try {
            const list = await certificateService.getTemplates();
            setTemplates(list);
            setSelectedTemplate(list.length > 0 ? list[0].id : null);
        } catch { setTemplates([]); }
        setShowCert(true);
    };

    const handleGenerateCert = async () => {
        if (!linkedGrainId || !selectedTemplate) return;
        setCertLoading(true);
        try {
            const result = await certificateService.generate(linkedGrainId, selectedTemplate);
            Alert.alert('Certificate Ready!', `File: ${result.fileName}`, [
                { text: 'Download', onPress: () => Linking.openURL(result.downloadUrl) },
                { text: 'OK' },
            ]);
            setShowCert(false);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to generate');
        } finally {
            setCertLoading(false);
        }
    };

    const openPrivacy = () => {
        setPrivPublic(profile?.isProfilePublic ?? true);
        setPrivEmail(true);
        setPrivPush(true);
        setShowPrivacy(true);
    };

    const handleSavePrivacy = async () => {
        if (!linkedGrainId) return;
        try {
            await volunteerService.updatePrivacySettings(linkedGrainId, {
                isProfilePublic: privPublic,
                allowEmail: privEmail,
                allowPush: privPush,
            });
            setShowPrivacy(false);
            Alert.alert('Success', 'Privacy settings updated!');
            await fetchProfile();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to update');
        }
    };

    const stats = profile
        ? { totalHours: profile.totalHours, completedOpportunities: profile.completedOpportunities, impactScore: profile.impactScore }
        : { totalHours: 0, completedOpportunities: 0, impactScore: 0 };

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
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            {/* Profile Header */}
            <Surface style={styles.header} elevation={2}>
                <Avatar.Icon size={80} icon="account" style={styles.avatar} />
                <Text variant="headlineSmall" style={styles.name}>
                    {profile?.firstName && profile?.lastName
                        ? `${profile.firstName} ${profile.lastName}`
                        : email}
                </Text>
                <Text style={styles.role}>{role}</Text>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                {profile?.phone ? <Text style={styles.phone}>📞 {profile.phone}</Text> : null}
            </Surface>

            {/* Impact Stats */}
            <View style={styles.statsRow}>
                <Surface style={styles.statCard} elevation={1}>
                    <MaterialCommunityIcons name="clock-outline" size={28} color={COLORS.primary} />
                    <Text variant="headlineSmall" style={styles.statValue}>{stats.totalHours}</Text>
                    <Text style={styles.statLabel}>Hours</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                    <MaterialCommunityIcons name="check-decagram" size={28} color={COLORS.success} />
                    <Text variant="headlineSmall" style={styles.statValue}>{stats.completedOpportunities}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                    <MaterialCommunityIcons name="star" size={28} color={COLORS.warning} />
                    <Text variant="headlineSmall" style={styles.statValue}>{stats.impactScore}</Text>
                    <Text style={styles.statLabel}>Impact</Text>
                </Surface>
            </View>

            {/* Actions */}
            <Card style={styles.actionsCard} mode="outlined">
                <Card.Content>
                    <ActionItem icon="account-edit" label="Edit Profile" onPress={openEdit} />
                    <Divider style={styles.divider} />
                    <ActionItem icon="shield-check" label={`Credentials (${profile?.credentials?.length ?? 0})`}
                        onPress={() => setShowCredential(true)} />
                    <Divider style={styles.divider} />
                    <ActionItem icon="certificate" label="Generate Certificate" onPress={handleOpenCertModal} />
                    <Divider style={styles.divider} />
                    <ActionItem icon="bell-outline" label="Notifications" onPress={openPrivacy} />
                    <Divider style={styles.divider} />
                    <ActionItem icon="cog-outline" label="Privacy Settings" onPress={openPrivacy} />
                </Card.Content>
            </Card>

            {/* Credentials List */}
            {profile?.credentials && profile.credentials.length > 0 && (
                <Card style={styles.credCard} mode="outlined">
                    <Card.Content>
                        <Text variant="titleMedium" style={{ color: COLORS.text, marginBottom: 8 }}>My Credentials</Text>
                        {profile.credentials.map((cred, i) => (
                            <Text key={i} style={styles.credItem}>🏅 {cred}</Text>
                        ))}
                    </Card.Content>
                </Card>
            )}

            <Button mode="outlined" onPress={logout} textColor={COLORS.error} style={styles.logoutButton}>
                Logout
            </Button>

            {/* Edit Profile Modal */}
            <Portal>
                <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Edit Profile</Text>
                    <TextInput label="First Name" value={editFirst} onChangeText={setEditFirst} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Last Name" value={editLast} onChangeText={setEditLast} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Phone" value={editPhone} onChangeText={setEditPhone} mode="outlined"
                        keyboardType="phone-pad" style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Bio" value={editBio} onChangeText={setEditBio} mode="outlined"
                        multiline style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleSaveProfile} loading={saving} disabled={saving}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Save</Button>
                </Modal>
            </Portal>

            {/* Upload Credential Modal */}
            <Portal>
                <Modal visible={showCredential} onDismiss={() => setShowCredential(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Upload Credential</Text>
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 16 }}>Select a file from your device to upload as a credential.</Text>
                    <Button mode="contained" onPress={handleUploadCredential}
                        buttonColor={COLORS.primary} icon="file-upload">Choose File & Upload</Button>
                </Modal>
            </Portal>

            {/* Generate Certificate Modal */}
            <Portal>
                <Modal visible={showCert} onDismiss={() => setShowCert(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Generate Certificate</Text>
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 12 }}>Select a template:</Text>
                    {templates.length === 0 ? (
                        <Text style={{ color: COLORS.textSecondary }}>No templates available. Ask your admin to seed presets.</Text>
                    ) : (
                        templates.map(t => (
                            <Card key={t.id} mode="outlined"
                                style={[styles.appCard, selectedTemplate === t.id && { borderColor: t.primaryColor, borderWidth: 2 }]}
                                onPress={() => setSelectedTemplate(t.id)}>
                                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[styles.colorDot, { backgroundColor: t.primaryColor }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{t.name}</Text>
                                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                                            {t.isSystemPreset ? '🌐 System Preset' : `🏢 ${t.organizationName}`}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name={selectedTemplate === t.id ? 'radiobox-marked' : 'radiobox-blank'}
                                        size={20} color={selectedTemplate === t.id ? t.primaryColor : COLORS.textSecondary}
                                    />
                                </Card.Content>
                            </Card>
                        ))
                    )}
                    <Button mode="contained" onPress={handleGenerateCert}
                        loading={certLoading} disabled={!selectedTemplate || certLoading}
                        buttonColor={COLORS.primary} style={{ marginTop: 16 }} icon="file-certificate">
                        Generate PDF
                    </Button>
                </Modal>
            </Portal>

            {/* Privacy Settings Modal */}
            <Portal>
                <Modal visible={showPrivacy} onDismiss={() => setShowPrivacy(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Privacy Settings</Text>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Public Profile</Text>
                        <Switch value={privPublic} onValueChange={setPrivPublic} trackColor={{ true: COLORS.primary }} />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Email Notifications</Text>
                        <Switch value={privEmail} onValueChange={setPrivEmail} trackColor={{ true: COLORS.primary }} />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Push Notifications</Text>
                        <Switch value={privPush} onValueChange={setPrivPush} trackColor={{ true: COLORS.primary }} />
                    </View>
                    <Button mode="contained" onPress={handleSavePrivacy} buttonColor={COLORS.primary}
                        style={{ marginTop: 12 }}>Save</Button>
                </Modal>
            </Portal>
        </ScrollView>
    );
}

function ActionItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
    return (
        <Button mode="text" onPress={onPress} contentStyle={actionStyles.content} style={actionStyles.btn}>
            <View style={actionStyles.row}>
                <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />
                <Text style={actionStyles.label}>{label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
            </View>
        </Button>
    );
}

const actionStyles = StyleSheet.create({
    content: { justifyContent: 'flex-start' },
    btn: { paddingVertical: 4 },
    row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    label: { flex: 1, marginLeft: 16, color: COLORS.text, fontSize: 16 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    avatar: { backgroundColor: COLORS.primary, marginBottom: 12 },
    name: { color: COLORS.text },
    role: { color: COLORS.textSecondary, marginTop: 4 },
    bio: { color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
    phone: { color: COLORS.textSecondary, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: COLORS.surface },
    statValue: { color: COLORS.text, marginTop: 8 },
    statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    actionsCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 16, marginBottom: 16 },
    divider: { backgroundColor: COLORS.border },
    credCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 16, marginBottom: 16 },
    credItem: { color: COLORS.textSecondary, marginBottom: 4 },
    logoutButton: { borderColor: COLORS.error, marginBottom: 32 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    toggleLabel: { color: COLORS.text, fontSize: 16 },
    appCard: { marginBottom: 8, backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border },
    colorDot: { width: 16, height: 16, borderRadius: 8 },
});

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Button, Card, Text, Surface, ActivityIndicator, Portal, Modal, TextInput, Divider } from 'react-native-paper';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { certificateService, CertificateTemplate } from '../../services/certificates';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CertificateTemplatesScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#1A237E');
    const [accentColor, setAccentColor] = useState('#C5A23E');
    const [titleText, setTitleText] = useState('');
    const [bodyTemplate, setBodyTemplate] = useState('');
    const [signatoryName, setSignatoryName] = useState('');
    const [signatoryTitle, setSignatoryTitle] = useState('');

    const fetchTemplates = useCallback(async () => {
        try {
            const list = await certificateService.getTemplates(linkedGrainId || undefined);
            setTemplates(list);
        } catch (err: any) {
            console.log('Fetch templates error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTemplates();
        setRefreshing(false);
    }, [fetchTemplates]);

    const resetForm = () => {
        setName(''); setDescription('');
        setPrimaryColor('#1A237E'); setAccentColor('#C5A23E');
        setTitleText(''); setBodyTemplate('');
        setSignatoryName(''); setSignatoryTitle('');
    };

    const handleCreate = async () => {
        if (!name.trim()) { Alert.alert('Required', 'Template name is required.'); return; }
        setSaving(true);
        try {
            await certificateService.createTemplate({
                name,
                description,
                organizationId: linkedGrainId || undefined,
                primaryColor,
                accentColor,
                titleText: titleText || undefined,
                bodyTemplate: bodyTemplate || undefined,
                signatoryName: signatoryName || undefined,
                signatoryTitle: signatoryTitle || undefined,
            });
            setShowCreate(false);
            resetForm();
            Alert.alert('Success', 'Template created!');
            await fetchTemplates();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to create');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string, templateName: string) => {
        Alert.alert('Delete Template', `Delete "${templateName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await certificateService.deleteTemplate(id);
                        Alert.alert('Deleted');
                        await fetchTemplates();
                    } catch { Alert.alert('Error', 'Failed to delete'); }
                }
            },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const systemPresets = templates.filter(t => t.isSystemPreset);
    const customTemplates = templates.filter(t => !t.isSystemPreset);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            <Surface style={styles.header} elevation={2}>
                <MaterialCommunityIcons name="certificate" size={48} color={COLORS.primary} />
                <Text variant="headlineSmall" style={{ color: COLORS.text, marginTop: 8 }}>Certificate Templates</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>
                    Manage templates for volunteer hour certificates
                </Text>
            </Surface>

            {/* System Presets */}
            <Text variant="titleMedium" style={styles.sectionTitle}>🌐 System Presets</Text>
            {systemPresets.length === 0 ? (
                <Card style={styles.emptyCard} mode="outlined">
                    <Card.Content>
                        <Text style={{ color: COLORS.textSecondary }}>No system presets. Ask admin to seed presets.</Text>
                    </Card.Content>
                </Card>
            ) : (
                systemPresets.map(t => <TemplateCard key={t.id} template={t} />)
            )}

            {/* Custom Templates */}
            <Text variant="titleMedium" style={styles.sectionTitle}>🏢 Organization Templates</Text>
            {customTemplates.map(t => (
                <TemplateCard key={t.id} template={t} onDelete={() => handleDelete(t.id, t.name)} />
            ))}
            <Button mode="contained" onPress={() => setShowCreate(true)} buttonColor={COLORS.primary}
                icon="plus" style={{ marginTop: 8, marginBottom: 24 }}>
                Create New Template
            </Button>

            {/* Create Template Modal */}
            <Portal>
                <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={styles.modal}>
                    <ScrollView>
                        <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>New Template</Text>
                        <TextInput label="Template Name *" value={name} onChangeText={setName} mode="outlined"
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined"
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <View style={styles.colorRow}>
                            <TextInput label="Primary Color" value={primaryColor} onChangeText={setPrimaryColor} mode="outlined"
                                style={[styles.input, { flex: 1 }]} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                            <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                            <TextInput label="Accent Color" value={accentColor} onChangeText={setAccentColor} mode="outlined"
                                style={[styles.input, { flex: 1 }]} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                            <View style={[styles.colorPreview, { backgroundColor: accentColor }]} />
                        </View>
                        <TextInput label="Certificate Title" value={titleText} onChangeText={setTitleText} mode="outlined"
                            placeholder="e.g. Certificate of Volunteer Service"
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <TextInput label="Body Text (use {{VolunteerName}}, {{TotalHours}}, etc.)" value={bodyTemplate}
                            onChangeText={setBodyTemplate} mode="outlined" multiline numberOfLines={3}
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <TextInput label="Signatory Name" value={signatoryName} onChangeText={setSignatoryName} mode="outlined"
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <TextInput label="Signatory Title" value={signatoryTitle} onChangeText={setSignatoryTitle} mode="outlined"
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                        <Button mode="contained" onPress={handleCreate} loading={saving} disabled={saving}
                            buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Create Template</Button>
                    </ScrollView>
                </Modal>
            </Portal>
        </ScrollView>
    );
}

function TemplateCard({ template: t, onDelete }: { template: CertificateTemplate; onDelete?: () => void }) {
    return (
        <Card style={styles.templateCard} mode="outlined">
            <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <View style={[styles.dot, { backgroundColor: t.primaryColor }]} />
                        <View style={[styles.dot, { backgroundColor: t.accentColor }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>{t.name}</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{t.description}</Text>
                    </View>
                    {onDelete && (
                        <Button mode="text" onPress={onDelete} textColor={COLORS.error} compact>Delete</Button>
                    )}
                </View>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    header: { alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: COLORS.surface, marginBottom: 16 },
    sectionTitle: { color: COLORS.text, marginTop: 16, marginBottom: 8 },
    emptyCard: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, marginBottom: 8 },
    templateCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, marginBottom: 8, borderRadius: 12 },
    dot: { width: 14, height: 14, borderRadius: 7 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16, maxHeight: '85%' },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
    colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    colorPreview: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
});

import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, Surface, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Skill, skillService } from '../../services/skills';
import { COLORS } from '../../constants/config';

export default function AdminSkillsScreen() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // Form inputs
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadSkills = async () => {
        setLoading(true);
        try {
            const data = await skillService.getAll();
            setSkills(data);
        } catch {
            setMessage('Failed to load skills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSkills();
    }, []);

    const handleCreate = async () => {
        if (!name.trim() || !category.trim() || !description.trim()) {
            setMessage('All fields are required');
            return;
        }

        setSubmitting(true);
        try {
            await skillService.createSkill({
                name: name.trim(),
                category: category.trim(),
                description: description.trim()
            });
            setMessage('Skill created successfully');
            setName('');
            setCategory('');
            setDescription('');
            loadSkills();
        } catch (err: any) {
            setMessage(err.response?.data?.Error || 'Failed to create skill');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (skill: Skill) => {
        Alert.alert(
            'Delete Skill',
            `Are you sure you want to delete "${skill.name}"? This removes it from all volunteers and opportunities.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await skillService.deleteSkill(skill.id);
                            setMessage('Skill deleted');
                            loadSkills();
                        } catch {
                            setMessage('Failed to delete skill');
                        }
                    }
                }
            ]
        );
    };

    if (loading && !skills.length) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Create Skill Form */}
            <Surface style={styles.formContainer} elevation={1}>
                <Text variant="titleMedium" style={styles.formTitle}>Add New Skill</Text>
                <View style={styles.row}>
                    <TextInput
                        label="Category (e.g., Medical, IT)"
                        value={category}
                        onChangeText={setCategory}
                        mode="outlined"
                        style={[styles.flex1, styles.formInput]}
                        dense
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />
                    <TextInput
                        label="Skill Name"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={[styles.flex1, styles.formInput]}
                        dense
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />
                </View>
                <TextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    style={[styles.input, styles.formInput]}
                    multiline
                    numberOfLines={2}
                    dense
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                    textColor={COLORS.text}
                />
                <Button
                    mode="contained"
                    onPress={handleCreate}
                    loading={submitting}
                    disabled={submitting}
                    style={styles.button}
                >
                    Create Skill
                </Button>
            </Surface>

            <Text variant="titleSmall" style={styles.listHeader}>Existing Skills</Text>

            {/* Skills List */}
            <FlatList
                data={skills}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                    <Surface style={styles.skillItem} elevation={1}>
                        <View style={styles.skillContent}>
                            <Text style={styles.categoryBadge}>{item.category}</Text>
                            <Text variant="titleMedium">{item.name}</Text>
                            <Text variant="bodySmall" style={styles.desc}>{item.description}</Text>
                        </View>
                        <IconButton
                            icon="delete"
                            iconColor={COLORS.error}
                            onPress={() => handleDelete(item)}
                        />
                    </Surface>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No skills found.</Text>}
            />

            <Snackbar
                visible={!!message}
                onDismiss={() => setMessage('')}
                duration={3000}
            >
                {message}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    formContainer: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        marginBottom: 16,
    },
    formTitle: { fontWeight: '700', marginBottom: 12 },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    flex1: { flex: 1 },
    input: { marginBottom: 12 },
    button: { marginTop: 4 },
    listHeader: { fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
    skillItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: COLORS.surface
    },
    skillContent: { flex: 1, marginRight: 8 },
    categoryBadge: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    desc: { color: COLORS.textSecondary, marginTop: 4 },
    empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
    formInput: { backgroundColor: COLORS.surfaceLight },
});

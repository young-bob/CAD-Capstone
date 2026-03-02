import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Chip, ActivityIndicator, Snackbar, Divider, Surface } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { Skill, skillService } from '../../services/skills';
import { COLORS } from '../../constants/config';

export default function SkillsScreen() {
    const { userId } = useAuthStore();

    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [mySkillIds, setMySkillIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!userId) return;
        Promise.all([
            skillService.getAll(),
            skillService.getVolunteerSkills(userId),
        ]).then(([all, mine]) => {
            setAllSkills(all);
            setMySkillIds(new Set(mine.map(s => s.id)));
        }).finally(() => setLoading(false));
    }, [userId]);

    const toggle = async (skillId: string) => {
        if (!userId) return;
        try {
            if (mySkillIds.has(skillId)) {
                await skillService.removeSkill(userId, skillId);
                setMySkillIds(prev => { const s = new Set(prev); s.delete(skillId); return s; });
            } else {
                await skillService.addSkill(userId, skillId);
                setMySkillIds(prev => new Set([...prev, skillId]));
            }
        } catch {
            setMessage('Failed to update skill. Please try again.');
        }
    };

    // Group by category
    const byCategory = allSkills.reduce<Record<string, Skill[]>>((acc, s) => {
        (acc[s.category || 'General'] ??= []).push(s);
        return acc;
    }, {});

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text variant="titleMedium" style={styles.header}>My Skills</Text>
            <Text style={styles.sub}>Tap to add or remove skills from your profile.</Text>

            <FlatList
                data={Object.entries(byCategory)}
                keyExtractor={([cat]) => cat}
                renderItem={({ item: [category, skills] }) => (
                    <Surface style={styles.card} elevation={1}>
                        <Text style={styles.category}>{category}</Text>
                        <Divider style={{ marginBottom: 8 }} />
                        <View style={styles.chips}>
                            {skills.map(skill => (
                                <Chip
                                    key={skill.id}
                                    selected={mySkillIds.has(skill.id)}
                                    onPress={() => toggle(skill.id)}
                                    style={[
                                        styles.chip,
                                        mySkillIds.has(skill.id) && styles.chipSelected,
                                    ]}
                                    textStyle={{ color: mySkillIds.has(skill.id) ? '#fff' : COLORS.text }}
                                >
                                    {skill.name}
                                </Chip>
                            ))}
                        </View>
                    </Surface>
                )}
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
    header: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
    sub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
    card: { borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: COLORS.surface },
    category: { fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: COLORS.surfaceLight },
    chipSelected: { backgroundColor: COLORS.primary },
});

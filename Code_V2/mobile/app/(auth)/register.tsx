import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, SegmentedButtons } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth';
import { COLORS } from '../../constants/config';
import { UserRole } from '../../types/enums';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('Volunteer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const setAuth = useAuthStore((s) => s.setAuth);

    const handleRegister = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await authService.register({ email, password, role });
            await setAuth(data);
        } catch (err: any) {
            setError(err.response?.status === 409 ? 'Email already registered' : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.inner}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>VSMS</Text>
                    <Text style={styles.subtitle}>Create Your Account</Text>
                </View>

                <Surface style={styles.card} elevation={2}>
                    <Text variant="headlineSmall" style={styles.title}>Register</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Role Selection */}
                    <Text style={styles.label}>I am a:</Text>
                    <SegmentedButtons
                        value={role}
                        onValueChange={(v) => setRole(v as UserRole)}
                        buttons={[
                            { value: 'Volunteer', label: 'Volunteer' },
                            { value: 'Coordinator', label: 'Coordinator' },
                        ]}
                        style={styles.segmented}
                    />

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        left={<TextInput.Icon icon="email" />}
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry
                        left={<TextInput.Icon icon="lock" />}
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />

                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        mode="outlined"
                        secureTextEntry
                        left={<TextInput.Icon icon="lock-check" />}
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        buttonColor={COLORS.primary}
                    >
                        Create Account
                    </Button>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <Text style={styles.link}>Login</Text>
                        </Link>
                    </View>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    logoText: { fontSize: 48, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
    card: { padding: 24, borderRadius: 16, backgroundColor: COLORS.surface },
    title: { textAlign: 'center', marginBottom: 20, color: COLORS.text },
    label: { color: COLORS.textSecondary, marginBottom: 8 },
    segmented: { marginBottom: 16 },
    input: { marginBottom: 16, backgroundColor: COLORS.surfaceLight },
    button: { marginTop: 8, paddingVertical: 4, borderRadius: 8 },
    error: { color: COLORS.error, textAlign: 'center', marginBottom: 12 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: COLORS.textSecondary },
    link: { color: COLORS.primary, fontWeight: '600' },
});

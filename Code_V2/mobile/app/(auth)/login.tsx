import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth';
import { COLORS } from '../../constants/config';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await authService.login({ email, password });
            await setAuth(data);
            // AuthGuard in _layout will handle redirect
        } catch (err: any) {
            setError(err.response?.status === 401 ? 'Invalid credentials' : 'Login failed. Check server connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.inner}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>VSMS</Text>
                    <Text style={styles.subtitle}>Volunteer Service Management</Text>
                </View>

                {/* Form */}
                <Surface style={styles.card} elevation={2}>
                    <Text variant="headlineSmall" style={styles.title}>Welcome Back</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

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
                        secureTextEntry={!showPassword}
                        left={<TextInput.Icon icon="lock" />}
                        right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.text}
                    />

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        buttonColor={COLORS.primary}
                    >
                        Login
                    </Button>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <Link href="/(auth)/register" asChild>
                            <Text style={styles.link}>Register</Text>
                        </Link>
                    </View>
                </Surface>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    inner: { flex: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoText: { fontSize: 48, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
    card: { padding: 24, borderRadius: 16, backgroundColor: COLORS.surface },
    title: { textAlign: 'center', marginBottom: 20, color: COLORS.text },
    input: { marginBottom: 16, backgroundColor: COLORS.surfaceLight },
    button: { marginTop: 8, paddingVertical: 4, borderRadius: 8 },
    error: { color: COLORS.error, textAlign: 'center', marginBottom: 12 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: COLORS.textSecondary },
    link: { color: COLORS.primary, fontWeight: '600' },
});

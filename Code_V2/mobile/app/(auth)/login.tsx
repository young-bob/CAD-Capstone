import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth';
import { COLORS } from '../../constants/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);

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
            if (err.response?.status === 401) {
                setError('Invalid credentials');
            } else {
                const msg = err.response?.data?.toString() || err.message || 'Network error';
                setError(`Login failed: ${msg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Amber hero header — matches website landing page */}
            <View style={styles.hero}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="heart" size={40} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>VSMS</Text>
                <Text style={styles.heroSub}>Volunteer Service Management</Text>
            </View>

            {/* Login form */}
            <View style={styles.formWrapper}>
                <Text variant="headlineSmall" style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue volunteering</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<TextInput.Icon icon="email-outline" />}
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
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={<TextInput.Icon icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword(!showPassword)} />}
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
                    contentStyle={{ paddingVertical: 4 }}
                >
                    Sign In
                </Button>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/(auth)/register" asChild>
                        <Text style={styles.link}>Register</Text>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    hero: {
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        paddingTop: 72,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 3 },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

    formWrapper: {
        flex: 1, padding: 24, paddingTop: 28,
        backgroundColor: COLORS.background,
    },
    title: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20 },

    input: { marginBottom: 14, backgroundColor: COLORS.surface },
    button: { marginTop: 4, borderRadius: 10 },
    error: { color: COLORS.error, marginBottom: 12, fontSize: 13 },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { color: COLORS.textSecondary },
    link: { color: COLORS.primary, fontWeight: '700' },
});

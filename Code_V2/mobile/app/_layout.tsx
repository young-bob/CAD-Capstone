import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../constants/config';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: COLORS.primary,
        secondary: COLORS.secondary,
        background: COLORS.background,
        surface: COLORS.surface,
        error: COLORS.error,
        onPrimary: '#FFFFFF',
        onSurface: COLORS.text,
        onBackground: COLORS.text,
        outline: COLORS.border,
    },
};

function AuthGuard() {
    const { token, role, isLoading, loadToken } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    useNotifications();

    useEffect(() => {
        loadToken();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!token && !inAuthGroup) {
            // Not logged in, redirect to login
            router.replace('/(auth)/login');
        } else if (token && inAuthGroup) {
            // Logged in, redirect to appropriate role home
            switch (role) {
                case 'Coordinator':
                    router.replace('/(coordinator)/dashboard');
                    break;
                case 'SystemAdmin':
                    router.replace('/(admin)/organizations');
                    break;
                default:
                    router.replace('/(volunteer)/dashboard');
            }
        }
    }, [token, isLoading, segments]);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return <Slot />;
}

export default function RootLayout() {
    return (
        <PaperProvider theme={theme}>
            <StatusBar style="dark" />
            <AuthGuard />
        </PaperProvider>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
});

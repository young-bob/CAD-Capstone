import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
    const { token, role } = useAuthStore();

    if (!token) {
        return <Redirect href="/(auth)/login" />;
    }

    switch (role) {
        case 'Coordinator':
            return <Redirect href="/(coordinator)/dashboard" />;
        case 'SystemAdmin':
            return <Redirect href="/(admin)/organizations" />;
        default:
            return <Redirect href="/(volunteer)/home" />;
    }
}

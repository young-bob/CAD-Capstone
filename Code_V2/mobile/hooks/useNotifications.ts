import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { volunteerService } from '../services/volunteers';
import { useAuthStore } from '../stores/authStore';

// Dynamically import expo-notifications — it throws in Expo Go (SDK 53+)
let Notifications: typeof import('expo-notifications') | null = null;
try {
    Notifications = require('expo-notifications');
    Notifications!.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
} catch (e) {
    console.warn('[Push] expo-notifications not available (Expo Go SDK 53+). Push notifications disabled.');
}

/**
 * Hook that registers the device for push notifications on mount,
 * sends the Expo push token to the backend, and listens for incoming notifications.
 * Gracefully no-ops if expo-notifications is unavailable (e.g. Expo Go).
 */
export function useNotifications() {
    const { linkedGrainId, role } = useAuthStore();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        // Skip if notifications module isn't available or user isn't a volunteer
        if (!Notifications || !linkedGrainId || role !== 'Volunteer') return;

        registerForPushNotifications().then(async (token) => {
            if (token) {
                setExpoPushToken(token);
                try {
                    await volunteerService.registerPushToken(linkedGrainId, token);
                } catch (err) {
                    console.warn('Failed to register push token with backend:', err);
                }
            }
        });

        // Listen for incoming notifications while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('[Push] Notification received:', notification.request.content);
        });

        // Listen for user tapping on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('[Push] User tapped notification:', response.notification.request.content);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [linkedGrainId, role]);

    return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
    if (!Notifications) return null;

    try {
        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permissions if not already granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission not granted');
            return null;
        }

        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('[Push] Expo push token:', tokenData.data);

        // Set up Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
            });
        }

        return tokenData.data;
    } catch (error) {
        console.warn('Failed to get Expo push token:', error);
        return null;
    }
}

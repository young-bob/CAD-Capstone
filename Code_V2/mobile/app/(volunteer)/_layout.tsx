import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/config';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function VolunteerLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.text,
                tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Explore',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="compass" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="my-applications"
                options={{
                    title: 'Applications',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    title: 'Check In',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-check" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="attendance"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="skills"
                options={{
                    title: 'Skills',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="star-circle" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}

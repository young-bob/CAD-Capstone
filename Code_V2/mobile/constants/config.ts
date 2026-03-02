// API base URL
// Deployed: points to Nginx load balancer
// Android Emulator: 10.0.2.2 = host machine's localhost
// iOS Simulator:    localhost works directly
import { Platform } from 'react-native';

// Production: Nginx load balancer IP
const PRODUCTION_URL = 'http://10.20.30.1';

// Development: local Docker
const DEV_URL = Platform.select({
    android: 'http://10.0.2.2:8080',
    ios: 'http://localhost:8080',
    default: 'http://localhost:8080',
})!;

// Toggle: set to true when using deployed servers
const USE_PRODUCTION = true;

export const API_BASE_URL = USE_PRODUCTION ? PRODUCTION_URL : DEV_URL;

export const COLORS = {
    primary: '#0D9488',       // Warm teal — growth, nature, community
    primaryDark: '#0F766E',   // Deeper teal for headers
    secondary: '#F97316',     // Warm orange — energy, enthusiasm
    background: '#FAFAF5',    // Warm off-white, not clinical
    surface: '#FFFFFF',       // Pure white cards
    surfaceLight: '#F0F0EB',  // Light warm gray for inputs / sub-sections
    text: '#1C1917',          // Dark charcoal — easy to read
    textSecondary: '#78716C', // Warm gray
    success: '#16A34A',       // Fresh green
    warning: '#F59E0B',       // Amber
    error: '#DC2626',         // Clear red
    border: '#E5E2DB',        // Subtle warm border
};

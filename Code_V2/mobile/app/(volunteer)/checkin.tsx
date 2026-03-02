import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { Button, Text, Surface, Card, ActivityIndicator, Portal, Modal, TextInput, Chip } from 'react-native-paper';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { COLORS } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import { volunteerService } from '../../services/volunteers';
import { applicationService } from '../../services/applications';
import { attendanceService } from '../../services/attendance';
import { opportunityService } from '../../services/opportunities';
import { fileService } from '../../services/files';
import { ApplicationStatus } from '../../types/enums';
import { GeoFenceSettings } from '../../types/opportunity';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ActiveApp {
    id: string;
    oppId: string;
    oppTitle: string;
    shiftId: string;
}

export default function CheckInScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeApps, setActiveApps] = useState<ActiveApp[]>([]);
    const [selectedApp, setSelectedApp] = useState<ActiveApp | null>(null);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [checkedIn, setCheckedIn] = useState(false);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Geofence of selected opportunity
    const [geoFence, setGeoFence] = useState<GeoFenceSettings | null>(null);
    const [geoFenceLoading, setGeoFenceLoading] = useState(false);

    // Feedback state
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState('5');
    const [feedbackComment, setFeedbackComment] = useState('');

    // Dispute state
    const [showDispute, setShowDispute] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeEvidence, setDisputeEvidence] = useState('');

    // Fetch approved applications
    const fetchApps = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const apps = await applicationService.getForVolunteer(linkedGrainId);
            const results: ActiveApp[] = apps
                .filter(a => a.status === ApplicationStatus.Approved || a.status === ApplicationStatus.Completed)
                .map(a => ({
                    id: a.applicationId,
                    oppId: a.opportunityId,
                    oppTitle: `${a.opportunityTitle} (${a.shiftName})`,
                    shiftId: a.shiftId,
                }));
            setActiveApps(results);
        } catch { /* */ } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchApps(); }, [fetchApps]);

    // When user selects an event, fetch its geofence
    const handleSelectApp = async (app: ActiveApp) => {
        setSelectedApp(app);
        setGeoFence(null);
        setGeoFenceLoading(true);
        try {
            const opp = await opportunityService.getById(app.oppId);
            setGeoFence(opp.geoFence ?? null);
        } catch { /* */ } finally {
            setGeoFenceLoading(false);
        }
    };

    const handleGetLocation = async () => {
        try {
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for check-in.');
                return;
            }
            const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        } catch {
            Alert.alert('Error', 'Failed to get location.');
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { launchCameraAsync, requestCameraPermissionsAsync } = await import('expo-image-picker');
            const { status } = await requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required.');
                return;
            }
            const result = await launchCameraAsync({ quality: 0.5 });
            if (!result.canceled) {
                setPhoto(result.assets[0].uri);
            }
        } catch {
            Alert.alert('Error', 'Failed to take photo.');
        }
    };

    // Check if user is inside geofence (client-side preview)
    const isInsideGeoFence = (): boolean | null => {
        if (!geoFence || !location) return null; // no fence or no location yet
        const R = 6371000; // Earth radius in metres
        const dLat = ((geoFence.latitude - location.lat) * Math.PI) / 180;
        const dLon = ((geoFence.longitude - location.lon) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((location.lat * Math.PI) / 180) *
            Math.cos((geoFence.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= geoFence.radiusMeters;
    };

    const handleCheckIn = async () => {
        if (!location || !selectedApp || !linkedGrainId) {
            Alert.alert('Missing', 'Select an event and get your location first.');
            return;
        }
        setActionLoading(true);
        try {
            // Step 0: Validate geo-fence location
            const isInRange = await opportunityService.validateGeo(selectedApp.oppId, location.lat, location.lon);
            if (!isInRange) {
                Alert.alert('Out of Range', 'You are not within the allowed area for this event. Please move closer to the venue and try again.');
                return;
            }

            // Step 1: Initialize attendance record
            const newAttendanceId = crypto.randomUUID?.() || `${Date.now()}`;
            await attendanceService.init(newAttendanceId, {
                volunteerId: linkedGrainId,
                applicationId: selectedApp.id,
                opportunityId: selectedApp.oppId,
            });

            // Step 1.5: Upload proof photo
            let proofPhotoUrl = '';
            if (photo) {
                try {
                    proofPhotoUrl = await fileService.upload(photo, `checkin_${Date.now()}.jpg`, 'proof-photos');
                } catch {
                    proofPhotoUrl = '';
                }
            }

            // Step 2: Check in
            await attendanceService.checkIn(newAttendanceId, {
                lat: location.lat,
                lon: location.lon,
                proofPhotoUrl,
            });

            setAttendanceId(newAttendanceId);
            setCheckedIn(true);
            Alert.alert('Success', 'You have checked in!');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!attendanceId) return;
        setActionLoading(true);
        try {
            await attendanceService.checkOut(attendanceId);
            Alert.alert('Checked Out', 'Would you like to leave feedback?', [
                { text: 'Skip', onPress: resetState },
                { text: 'Leave Feedback', onPress: () => setShowFeedback(true) },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!linkedGrainId || !selectedApp) return;
        setActionLoading(true);
        try {
            await volunteerService.submitFeedback(linkedGrainId, {
                opportunityId: selectedApp.oppId,
                rating: parseInt(feedbackRating) || 5,
                comment: feedbackComment,
            });
            Alert.alert('Thank You', 'Feedback submitted!');
        } catch (err: any) {
            Alert.alert('Note', 'Feedback could not be submitted');
        } finally {
            setShowFeedback(false);
            resetState();
            setActionLoading(false);
        }
    };

    const handleRaiseDispute = async () => {
        if (!attendanceId || !disputeReason) return;
        setActionLoading(true);
        try {
            await attendanceService.dispute(attendanceId, {
                reason: disputeReason,
                evidenceUrl: disputeEvidence,
            });
            Alert.alert('Submitted', 'Your dispute has been submitted for admin review.');
            setShowDispute(false);
            setDisputeReason('');
            setDisputeEvidence('');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to submit dispute');
        } finally {
            setActionLoading(false);
        }
    };

    const resetState = () => {
        setCheckedIn(false);
        setLocation(null);
        setPhoto(null);
        setAttendanceId(null);
        setSelectedApp(null);
        setGeoFence(null);
        setFeedbackRating('5');
        setFeedbackComment('');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const insideFence = isInsideGeoFence();

    // Determine map region
    const mapRegion = location
        ? { latitude: location.lat, longitude: location.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }
        : geoFence
            ? { latitude: geoFence.latitude, longitude: geoFence.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : { latitude: 43.6532, longitude: -79.3832, latitudeDelta: 0.05, longitudeDelta: 0.05 };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Surface style={styles.card} elevation={2}>
                <MaterialCommunityIcons name="map-marker-check" size={64} color={COLORS.primary} style={styles.icon} />
                <Text variant="headlineSmall" style={styles.title}>
                    {checkedIn ? 'You are Checked In' : 'Check In to Event'}
                </Text>

                {!checkedIn ? (
                    <>
                        {/* Step 1: Select Event */}
                        <Text variant="titleSmall" style={styles.stepTitle}>1. Select Event</Text>
                        {activeApps.length === 0 ? (
                            <Text style={styles.hint}>No approved applications. Get approved for an event first.</Text>
                        ) : (
                            activeApps.map((app) => (
                                <Card key={app.id} mode="outlined"
                                    style={[styles.appCard, selectedApp?.id === app.id && styles.selectedCard]}
                                    onPress={() => handleSelectApp(app)}>
                                    <Card.Content style={styles.appRow}>
                                        <MaterialCommunityIcons
                                            name={selectedApp?.id === app.id ? 'radiobox-marked' : 'radiobox-blank'}
                                            size={20} color={selectedApp?.id === app.id ? COLORS.primary : COLORS.textSecondary}
                                        />
                                        <Text style={styles.appText}>{app.oppTitle}</Text>
                                    </Card.Content>
                                </Card>
                            ))
                        )}

                        {/* Step 2: Location + Map */}
                        <Text variant="titleSmall" style={styles.stepTitle}>2. Your Location</Text>

                        {selectedApp && (
                            <View style={styles.mapContainer}>
                                <MapView
                                    style={styles.map}
                                    region={mapRegion}
                                    showsUserLocation={false}
                                >
                                    {/* Geofence circle */}
                                    {geoFence && (
                                        <>
                                            <Marker
                                                coordinate={{ latitude: geoFence.latitude, longitude: geoFence.longitude }}
                                                pinColor="blue"
                                                title="Event Location"
                                                description={`Allowed radius: ${geoFence.radiusMeters}m`}
                                            />
                                            <Circle
                                                center={{ latitude: geoFence.latitude, longitude: geoFence.longitude }}
                                                radius={geoFence.radiusMeters}
                                                fillColor="rgba(59,130,246,0.12)"
                                                strokeColor="rgba(59,130,246,0.5)"
                                                strokeWidth={2}
                                            />
                                        </>
                                    )}

                                    {/* User's current location marker */}
                                    {location && (
                                        <Marker
                                            coordinate={{ latitude: location.lat, longitude: location.lon }}
                                            title="You are here"
                                        >
                                            <View style={styles.userMarker}>
                                                <MaterialCommunityIcons name="account" size={18} color="#fff" />
                                            </View>
                                        </Marker>
                                    )}
                                </MapView>

                                {/* Status banner on top of map */}
                                {location && geoFence && (
                                    <View style={[
                                        styles.mapBadge,
                                        { backgroundColor: insideFence ? COLORS.success + 'E0' : COLORS.error + 'E0' }
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={insideFence ? 'check-circle' : 'close-circle'}
                                            size={16} color="#fff"
                                        />
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>
                                            {insideFence ? 'Inside geofence ✓' : 'Outside geofence ✗'}
                                        </Text>
                                    </View>
                                )}

                                {!geoFence && !geoFenceLoading && (
                                    <View style={[styles.mapBadge, { backgroundColor: COLORS.textSecondary + 'D0' }]}>
                                        <Text style={{ color: '#fff', fontSize: 11 }}>No geofence set — any location OK</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.step}>
                            <View style={styles.stepRow}>
                                <MaterialCommunityIcons
                                    name={location ? 'check-circle' : 'crosshairs-gps'} size={24}
                                    color={location ? COLORS.success : COLORS.textSecondary}
                                />
                                <Text style={styles.stepText}>
                                    {location ? `📍 ${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : 'Tap to get your location'}
                                </Text>
                            </View>
                            <Button mode={location ? 'text' : 'contained'}
                                onPress={handleGetLocation}
                                buttonColor={location ? undefined : COLORS.primary}
                                textColor={location ? COLORS.primary : '#fff'}
                                icon={location ? 'refresh' : 'crosshairs-gps'}>
                                {location ? 'Refresh Location' : 'Get My Location'}
                            </Button>
                        </View>

                        {/* Step 3: Photo */}
                        <Text variant="titleSmall" style={styles.stepTitle}>3. Proof Photo (optional)</Text>
                        <View style={styles.step}>
                            <View style={styles.stepRow}>
                                <MaterialCommunityIcons
                                    name={photo ? 'check-circle' : 'camera'} size={24}
                                    color={photo ? COLORS.success : COLORS.textSecondary}
                                />
                                <Text style={styles.stepText}>
                                    {photo ? 'Photo captured ✓' : 'Take proof photo'}
                                </Text>
                            </View>
                            <Button mode="outlined" onPress={handleTakePhoto} textColor={COLORS.primary}>
                                {photo ? 'Retake' : 'Take Photo'}
                            </Button>
                        </View>

                        <Button mode="contained" onPress={handleCheckIn} buttonColor={COLORS.success}
                            style={styles.mainButton} disabled={!location || !selectedApp || actionLoading}
                            loading={actionLoading}>
                            Check In
                        </Button>
                    </>
                ) : (
                    <>
                        <Text style={styles.hint}>Event: {selectedApp?.oppTitle}</Text>
                        <Button mode="contained" onPress={handleCheckOut} buttonColor={COLORS.secondary}
                            style={styles.mainButton} loading={actionLoading} disabled={actionLoading}>
                            Check Out
                        </Button>
                        <Button mode="outlined" onPress={() => setShowDispute(true)} textColor={COLORS.warning}
                            style={{ marginTop: 12 }} icon="alert">
                            Raise Dispute
                        </Button>
                    </>
                )}
            </Surface>

            {/* Feedback Modal */}
            <Portal>
                <Modal visible={showFeedback} onDismiss={() => { setShowFeedback(false); resetState(); }}
                    contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Leave Feedback</Text>
                    <Text style={styles.hint}>How was your experience at "{selectedApp?.oppTitle}"?</Text>
                    <TextInput label="Rating (1-5)" value={feedbackRating} onChangeText={setFeedbackRating}
                        mode="outlined" keyboardType="numeric" style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Comment" value={feedbackComment} onChangeText={setFeedbackComment}
                        mode="outlined" multiline style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleSubmitFeedback} loading={actionLoading}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Submit Feedback</Button>
                </Modal>
            </Portal>

            {/* Dispute Modal */}
            <Portal>
                <Modal visible={showDispute} onDismiss={() => setShowDispute(false)}
                    contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Raise Dispute</Text>
                    <Text style={styles.hint}>If your attendance record is incorrect, describe the issue below.</Text>
                    <TextInput label="Reason" value={disputeReason} onChangeText={setDisputeReason}
                        mode="outlined" multiline style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Evidence URL (optional)" value={disputeEvidence} onChangeText={setDisputeEvidence}
                        mode="outlined" style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleRaiseDispute} loading={actionLoading}
                        disabled={!disputeReason || actionLoading}
                        buttonColor={COLORS.warning} style={{ marginTop: 8 }}>Submit Dispute</Button>
                </Modal>
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16 },
    card: { padding: 24, borderRadius: 16, backgroundColor: COLORS.surface },
    icon: { textAlign: 'center', marginBottom: 16 },
    title: { textAlign: 'center', color: COLORS.text, marginBottom: 16 },
    stepTitle: { color: COLORS.primary, marginTop: 16, marginBottom: 8 },
    hint: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
    appCard: { marginBottom: 8, backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border },
    selectedCard: { borderColor: COLORS.primary, borderWidth: 2 },
    appRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    appText: { color: COLORS.text, flex: 1 },
    step: { marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: COLORS.surfaceLight },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    stepText: { color: COLORS.text, flex: 1 },
    mainButton: { marginTop: 16, paddingVertical: 4, borderRadius: 8 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
    mapContainer: {
        height: 220, borderRadius: 12, overflow: 'hidden',
        marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    map: { flex: 1 },
    userMarker: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3,
    },
    mapBadge: {
        position: 'absolute', top: 8, left: 8, right: 8,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20,
    },
});

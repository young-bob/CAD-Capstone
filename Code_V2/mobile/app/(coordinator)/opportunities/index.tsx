import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Text, Chip, FAB, ActivityIndicator, Portal, Modal, TextInput, Button } from 'react-native-paper';
import MapView, { Marker, Circle, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { COLORS } from '../../../constants/config';
import { OpportunityStatus } from '../../../types/enums';
import { useAuthStore } from '../../../stores/authStore';
import { organizationService } from '../../../services/organizations';
import { opportunityService } from '../../../services/opportunities';
import { OpportunitySummary } from '../../../types/opportunity';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const STATUS_COLORS: Record<string, string> = {
    [OpportunityStatus.Draft]: COLORS.textSecondary,
    [OpportunityStatus.Published]: COLORS.success,
    [OpportunityStatus.InProgress]: COLORS.primary,
    [OpportunityStatus.Completed]: '#4CAF50',
    [OpportunityStatus.Cancelled]: COLORS.error,
};
const RADIUS_OPTIONS = [100, 250, 500, 1000, 2000, 5000];
const formatRadius = (r: number) => r >= 1000 ? `${r / 1000}km` : `${r}m`;
// ──────────────── Map-based Geo-fence Picker ────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface MapPickerProps {
    initialCoord: { latitude: number; longitude: number } | null;
    initialRadius: number;
    onConfirm: (coord: { latitude: number; longitude: number }, radius: number) => void;
    onCancel: () => void;
}

function GeoFenceMapPicker({ initialCoord, initialRadius, onConfirm, onCancel }: MapPickerProps) {
    const [pin, setPin] = useState(initialCoord);
    const [radius, setRadius] = useState(initialRadius);
    const [loadingLoc, setLoadingLoc] = useState(false);

    const DEFAULT_REGION = {
        latitude: initialCoord?.latitude ?? 43.6532,
        longitude: initialCoord?.longitude ?? -79.3832,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    const handleMapPress = (e: MapPressEvent) => {
        setPin(e.nativeEvent.coordinate);
    };

    const useMyLocation = async () => {
        setLoadingLoc(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Enable location to use this feature.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch {
            Alert.alert('Error', 'Could not get your location.');
        } finally {
            setLoadingLoc(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <MapView
                style={{ flex: 1 }}
                initialRegion={DEFAULT_REGION}
                onPress={handleMapPress}
            >
                {pin && (
                    <>
                        <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} />
                        <Circle
                            center={pin}
                            radius={radius}
                            fillColor="rgba(59,130,246,0.15)"
                            strokeColor="rgba(59,130,246,0.6)"
                            strokeWidth={2}
                        />
                    </>
                )}
            </MapView>

            {/* Bottom control bar */}
            <View style={mapStyles.controlBar}>
                <Text style={mapStyles.title}>Tap map to set geofence center</Text>

                {pin && (
                    <View style={{ marginBottom: 12 }}>
                        <Text style={mapStyles.label}>
                            📍 {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                        </Text>
                        <Text style={mapStyles.label}>Radius: {formatRadius(radius)}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {RADIUS_OPTIONS.map(r => (
                                <Chip key={r} compact
                                    selected={radius === r}
                                    onPress={() => setRadius(r)}
                                    style={{ backgroundColor: radius === r ? COLORS.primary : COLORS.surfaceLight }}
                                    textStyle={{ color: radius === r ? '#fff' : COLORS.text, fontSize: 12 }}>
                                    {formatRadius(r)}
                                </Chip>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Button mode="outlined" icon="crosshairs-gps" onPress={useMyLocation}
                        loading={loadingLoc} style={{ flex: 1 }}>
                        My Location
                    </Button>
                    <Button mode="contained" disabled={!pin} onPress={() => pin && onConfirm(pin, radius)}
                        buttonColor={COLORS.primary} style={{ flex: 1 }}>
                        Confirm
                    </Button>
                </View>
                <Button mode="text" onPress={onCancel} textColor={COLORS.textSecondary}
                    style={{ marginTop: 8 }}>Cancel</Button>
            </View>
        </View>
    );
}

const mapStyles = StyleSheet.create({
    controlBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 36,
    },
    title: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' },
    label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
});

// ──────────────── Main Screen ────────────────

export default function OpportunitiesScreen() {
    const { linkedGrainId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [category, setCategory] = useState('');
    const [creating, setCreating] = useState(false);

    const [showCancel, setShowCancel] = useState(false);
    const [cancelOppId, setCancelOppId] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Geofence map state
    const [geoCoord, setGeoCoord] = useState<{ latitude: number; longitude: number } | null>(null);
    const [geoRadius, setGeoRadius] = useState(500);
    const [showMapPicker, setShowMapPicker] = useState(false);

    const fetchOpps = useCallback(async () => {
        try {
            if (!linkedGrainId) return;
            const results = await organizationService.getOpportunities(linkedGrainId);
            setOpportunities(results);
        } catch (err: any) {
            console.log('Fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [linkedGrainId]);

    useEffect(() => { fetchOpps(); }, [fetchOpps]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOpps();
        setRefreshing(false);
    }, [fetchOpps]);

    const handleCreate = async () => {
        if (!title || !linkedGrainId) return;
        setCreating(true);
        try {
            await organizationService.createOpportunity(linkedGrainId, {
                title, description: desc, category: category || 'General',
            });
            setShowCreate(false);
            setTitle(''); setDesc(''); setCategory(''); setGeoCoord(null); setGeoRadius(500);
            Alert.alert('Success', 'Opportunity created! Add shifts and publish it.');
            await fetchOpps();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            await opportunityService.publish(id);
            Alert.alert('Published', 'Opportunity is now visible to volunteers!');
            await fetchOpps();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Add shifts before publishing');
        }
    };

    const openCancelModal = (id: string) => {
        setCancelOppId(id);
        setCancelReason('');
        setShowCancel(true);
    };

    const handleCancelSubmit = async () => {
        if (!cancelReason || !cancelOppId) return;
        setCancelling(true);
        try {
            await opportunityService.cancel(cancelOppId, cancelReason);
            setShowCancel(false);
            Alert.alert('Cancelled', 'Opportunity has been cancelled.');
            await fetchOpps();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.toString() || 'Failed to cancel');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={opportunities}
                keyExtractor={(item) => item.opportunityId}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => router.push(`/(coordinator)/opportunities/${item.opportunityId}`)}>
                        <Card style={styles.card} mode="outlined">
                            <Card.Content>
                                <View style={styles.row}>
                                    <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                                    <Chip compact
                                        style={[styles.chip, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textSecondary) + '20' }]}
                                        textStyle={{ color: STATUS_COLORS[item.status], fontSize: 11 }}
                                    >{item.status}</Chip>
                                </View>
                                <Text style={styles.meta} numberOfLines={1}>{item.category}</Text>
                                <Text style={styles.meta}>
                                    Spots: {item.totalSpots} max • {item.availableSpots} available
                                </Text>
                            </Card.Content>
                            {item.status === OpportunityStatus.Draft && (
                                <Card.Actions>
                                    <Button compact textColor={COLORS.primary}
                                        onPress={() => router.push(`/(coordinator)/opportunities/${item.opportunityId}`)}>
                                        Add Shifts
                                    </Button>
                                    <Button compact mode="contained" buttonColor={COLORS.success}
                                        onPress={() => handlePublish(item.opportunityId)}>
                                        Publish
                                    </Button>
                                </Card.Actions>
                            )}
                            {(item.status === OpportunityStatus.Published || item.status === OpportunityStatus.InProgress) && (
                                <Card.Actions>
                                    <Button compact textColor={COLORS.error} onPress={() => openCancelModal(item.opportunityId)}>
                                        Cancel Event
                                    </Button>
                                </Card.Actions>
                            )}
                        </Card>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="calendar-plus" size={56} color={COLORS.textSecondary} />
                        <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginTop: 12 }}>No Events Yet</Text>
                        <Text style={styles.emptyText}>Tap the + button to create your first opportunity.</Text>
                    </View>
                }
            />
            <FAB icon="plus" style={styles.fab} color="#fff" onPress={() => setShowCreate(true)} />

            <Portal>
                {/* Create Opportunity Modal */}
                <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Create Opportunity</Text>
                    <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Description" value={desc} onChangeText={setDesc} mode="outlined" multiline
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />
                    <TextInput label="Category" value={category} onChangeText={setCategory} mode="outlined"
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} textColor={COLORS.text} />

                    {/* Geofence Section */}
                    <Text style={{ color: COLORS.textSecondary, marginBottom: 8, fontSize: 12 }}>📍 Geofence (optional — restrict check-in by location)</Text>
                    {geoCoord ? (
                        <View style={{ backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginBottom: 4 }}>Location Set ✅</Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                                {geoCoord.latitude.toFixed(5)}, {geoCoord.longitude.toFixed(5)}  •  Radius: {geoRadius}m
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <Button compact mode="outlined" onPress={() => setShowMapPicker(true)} icon="map-marker">Edit on Map</Button>
                                <Button compact mode="text" textColor={COLORS.error} onPress={() => setGeoCoord(null)} icon="close">Remove</Button>
                            </View>
                        </View>
                    ) : (
                        <Button mode="outlined" onPress={() => setShowMapPicker(true)} icon="map-marker-plus"
                            style={{ marginBottom: 12 }}>Pick Location on Map</Button>
                    )}

                    <Button mode="contained" onPress={handleCreate} loading={creating} disabled={!title || creating}
                        buttonColor={COLORS.primary} style={{ marginTop: 8 }}>Create</Button>
                    <Button onPress={() => setShowCreate(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Cancel</Button>
                </Modal>

                {/* Map Picker (full-screen overlay) */}
                <Modal visible={showMapPicker} onDismiss={() => setShowMapPicker(false)}
                    contentContainerStyle={{ flex: 1, margin: 0, padding: 0 }}>
                    <GeoFenceMapPicker
                        initialCoord={geoCoord}
                        initialRadius={geoRadius}
                        onConfirm={(coord, radius) => {
                            setGeoCoord(coord);
                            setGeoRadius(radius);
                            setShowMapPicker(false);
                        }}
                        onCancel={() => setShowMapPicker(false)}
                    />
                </Modal>

                {/* Cancel Event Modal */}
                <Modal visible={showCancel} onDismiss={() => setShowCancel(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ color: COLORS.text, marginBottom: 16 }}>Cancel Event</Text>
                    <TextInput label="Reason (required)" value={cancelReason} onChangeText={setCancelReason} mode="outlined" multiline
                        style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.error} textColor={COLORS.text} />
                    <Button mode="contained" onPress={handleCancelSubmit} loading={cancelling} disabled={!cancelReason || cancelling}
                        buttonColor={COLORS.error} style={{ marginTop: 8 }}>Confirm Cancel</Button>
                    <Button onPress={() => setShowCancel(false)} textColor={COLORS.textSecondary} style={{ marginTop: 8 }}>Back</Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: 16 },
    card: { marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: COLORS.text, flex: 1 },
    chip: { alignSelf: 'flex-start' },
    meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: COLORS.textSecondary, marginTop: 4 },
    modal: { backgroundColor: COLORS.surface, padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: COLORS.surfaceLight },
});

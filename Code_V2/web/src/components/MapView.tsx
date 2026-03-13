import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom blue icon for current user position
const userIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface MapViewProps {
    lat: number;
    lon: number;
    radius: number; // geofence meters
    userLat?: number; // current user position (for check-in view)
    userLon?: number;
    height?: number;
}

export default function MapView({ lat, lon, radius, userLat, userLon, height = 280 }: MapViewProps) {
    return (
        <div style={{ height, borderRadius: 16, overflow: 'hidden', border: '1px solid #e7e5e4' }}>
            <MapContainer center={[lat, lon]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {/* Event location marker + geofence circle */}
                <Marker position={[lat, lon]} />
                <Circle
                    center={[lat, lon]}
                    radius={radius}
                    pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 2 }}
                />
                {/* User current position (shown during check-in) */}
                {userLat !== undefined && userLon !== undefined && (
                    <>
                        <Marker position={[userLat, userLon]} icon={userIcon} />
                        <Circle
                            center={[userLat, userLon]}
                            radius={15}
                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 2 }}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

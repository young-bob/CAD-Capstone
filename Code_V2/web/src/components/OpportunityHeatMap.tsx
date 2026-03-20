import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OpportunityRecommendation } from '../types';
import 'leaflet/dist/leaflet.css';

function makePinIcon(color: string) {
    return L.divIcon({
        className: '',
        html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22s14-12.667 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="6" fill="white"/>
        </svg>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -38],
    });
}

const greenPin = makePinIcon('#16a34a');
const orangePin = makePinIcon('#f97316');

function avg(values: number[]): number {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

interface FlyToSelectedProps {
    selectedOppId: string | null | undefined;
    points: OpportunityRecommendation[];
}

function FlyToSelected({ selectedOppId, points }: FlyToSelectedProps) {
    const map = useMap();
    useEffect(() => {
        if (!selectedOppId) return;
        const opp = points.find(p => p.opportunityId === selectedOppId);
        if (!opp || opp.latitude === null || opp.longitude === null) return;
        map.flyTo([opp.latitude, opp.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 });
    }, [selectedOppId, points, map]);

    return null;
}

function MyLocationButton({
    userLocation,
    onLocationFound,
}: {
    userLocation?: { lat: number; lon: number } | null;
    onLocationFound?: (coords: { lat: number; lon: number }) => void;
}) {
    const map = useMap();
    const [locating, setLocating] = useState(false);

    const handleClick = () => {
        if (userLocation) {
            map.flyTo([userLocation.lat, userLocation.lon], 14, { duration: 0.8 });
            return;
        }
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                map.flyTo([c.lat, c.lon], 14, { duration: 0.8 });
                onLocationFound?.(c);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
        );
    };

    return (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'auto' }}>
            <button
                onClick={handleClick}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'white', border: '1px solid #e7e5e4',
                    borderRadius: 20, padding: '6px 14px',
                    fontSize: 13, fontWeight: 700, color: '#1d4ed8',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
                {locating ? 'Locating...' : 'My Location'}
            </button>
        </div>
    );
}

interface OpportunityHeatMapProps {
    opportunities: OpportunityRecommendation[];
    userLocation?: { lat: number; lon: number } | null;
    selectedOppId?: string | null;
    onSelect?: (id: string) => void;
    onLocationFound?: (coords: { lat: number; lon: number }) => void;
    height?: number;
}

export default function OpportunityHeatMap({
    opportunities,
    userLocation,
    selectedOppId,
    onSelect,
    onLocationFound,
    height = 320,
}: OpportunityHeatMapProps) {
    const points = useMemo(
        () => opportunities.filter(o => o.latitude !== null && o.longitude !== null).slice(0, 300),
        [opportunities],
    );

    const center = useMemo<[number, number]>(() => {
        if (userLocation) return [userLocation.lat, userLocation.lon];
        if (points.length === 0) return [43.6532, -79.3832];
        return [avg(points.map(p => p.latitude!)), avg(points.map(p => p.longitude!))];
    }, [points, userLocation]);

    return (
        <div style={{ height, borderRadius: 16, overflow: 'hidden', border: '1px solid #e7e5e4', position: 'relative' }}>
            {/* "X nearby" badge */}
            {points.length > 0 && (
                <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 1000,
                    background: 'white', borderRadius: 20, padding: '4px 12px',
                    fontSize: 13, fontWeight: 700, color: '#1c1917',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                }}>
                    {points.length} nearby
                </div>
            )}

            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <FlyToSelected selectedOppId={selectedOppId} points={points} />
                <MyLocationButton userLocation={userLocation} onLocationFound={onLocationFound} />

                {/* User location — blue dot + 5km radius circle */}
                {userLocation && (
                    <>
                        <CircleMarker
                            center={[userLocation.lat, userLocation.lon]}
                            radius={10}
                            pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                        >
                            <Popup>You are here</Popup>
                        </CircleMarker>
                        <Circle
                            center={[userLocation.lat, userLocation.lon]}
                            radius={5000}
                            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.06, weight: 1.5 }}
                        />
                    </>
                )}

                {/* Opportunity pins */}
                {points.map((opp) => {
                    const isSelected = opp.opportunityId === selectedOppId;
                    return (
                        <Marker
                            key={opp.opportunityId}
                            position={[opp.latitude!, opp.longitude!]}
                            icon={isSelected ? orangePin : greenPin}
                            zIndexOffset={isSelected ? 1000 : 0}
                            eventHandlers={{ click: () => onSelect?.(opp.opportunityId) }}
                        >
                            <Popup>
                                <div style={{ minWidth: 180 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{opp.title}</div>
                                    <div style={{ fontSize: 12, color: '#78716c', marginBottom: 4 }}>{opp.organizationName}</div>
                                    {opp.distanceKm !== null && opp.distanceKm !== undefined && (
                                        <div style={{ fontSize: 12, color: '#57534e' }}>{opp.distanceKm.toFixed(1)} km away</div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

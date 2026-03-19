import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { OpportunityRecommendation } from '../types';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface OpportunityHeatMapProps {
    opportunities: OpportunityRecommendation[];
    userLocation?: { lat: number; lon: number } | null;
    height?: number;
}

function scoreToColor(score: number): string {
    if (score >= 0.8) return '#16a34a';
    if (score >= 0.6) return '#22c55e';
    if (score >= 0.45) return '#f59e0b';
    return '#ef4444';
}

function getRadiusByScore(score: number): number {
    return 7 + Math.round(score * 10);
}

function avg(values: number[]): number {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export default function OpportunityHeatMap({ opportunities, userLocation, height = 320 }: OpportunityHeatMapProps) {
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
        <div style={{ height, borderRadius: 16, overflow: 'hidden', border: '1px solid #e7e5e4' }}>
            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {userLocation && (
                    <>
                        <Marker position={[userLocation.lat, userLocation.lon]}>
                            <Popup>You are here</Popup>
                        </Marker>
                        <Circle
                            center={[userLocation.lat, userLocation.lon]}
                            radius={5000}
                            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1.5 }}
                        />
                    </>
                )}

                {points.map((opp) => {
                    const score = Math.max(0, Math.min(1, opp.recommendationScore ?? 0));
                    const color = scoreToColor(score);
                    return (
                        <CircleMarker
                            key={opp.opportunityId}
                            center={[opp.latitude!, opp.longitude!]}
                            radius={getRadiusByScore(score)}
                            pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1.5 }}
                        >
                            <Popup>
                                <div style={{ minWidth: 220 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{opp.title}</div>
                                    <div style={{ fontSize: 12, color: '#57534e', marginBottom: 6 }}>{opp.organizationName}</div>
                                    <div style={{ fontSize: 12, color: '#44403c' }}>Recommendation: {(score * 100).toFixed(0)}%</div>
                                    <div style={{ fontSize: 12, color: '#44403c' }}>Skill match: {opp.matchedSkillCount}/{opp.requiredSkillCount || 0}</div>
                                    {opp.distanceKm !== null && (
                                        <div style={{ fontSize: 12, color: '#44403c' }}>Distance: {opp.distanceKm.toFixed(1)} km</div>
                                    )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}


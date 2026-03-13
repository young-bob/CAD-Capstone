import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundlers issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
    lat: number;
    lon: number;
    radius: number; // meters
    onChange: (lat: number, lon: number) => void;
    onRadiusChange: (radius: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lon: number) => void }) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function MapPicker({ lat, lon, radius, onChange, onRadiusChange }: MapPickerProps) {
    return (
        <div className="space-y-3">
            <p className="text-xs text-stone-500">Click on the map to set the check-in location. Adjust the radius below.</p>
            <div style={{ height: 320, borderRadius: 16, overflow: 'hidden', border: '1px solid #e7e5e4' }}>
                <MapContainer center={[lat, lon]} zoom={15} style={{ height: '100%', width: '100%' }} key={`${lat}-${lon}`}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <ClickHandler onChange={onChange} />
                    <Marker position={[lat, lon]} />
                    <Circle
                        center={[lat, lon]}
                        radius={radius}
                        pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 2 }}
                    />
                </MapContainer>
            </div>
            <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-500 whitespace-nowrap">Geofence Radius</label>
                <input
                    type="range"
                    min={50}
                    max={2000}
                    step={50}
                    value={radius}
                    onChange={e => onRadiusChange(parseInt(e.target.value))}
                    className="flex-1 accent-orange-500"
                />
                <span className="text-sm font-bold text-orange-600 w-20 text-right">{radius} m</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-stone-500">
                <div>Lat: <strong className="text-stone-700">{lat.toFixed(6)}</strong></div>
                <div>Lon: <strong className="text-stone-700">{lon.toFixed(6)}</strong></div>
            </div>
        </div>
    );
}

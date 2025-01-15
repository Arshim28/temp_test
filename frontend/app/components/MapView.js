'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

export default function MapView() {
    return (
        <div className="map-view">
            <header className="map-view-header">
                <h1>Explore Lands with Terrastack</h1>
                <p>Discover available lands and their pricing on an interactive map.</p>
            </header>
            <div className="map-container">
                <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '500px', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    <Marker position={[51.505, -0.09]}>
                        <Popup>Land Plot: $200,000</Popup>
                    </Marker>
                </MapContainer>
            </div>
        </div>
    );
}

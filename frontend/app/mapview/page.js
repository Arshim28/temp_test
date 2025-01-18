'use client';

import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

export default function MapView() {
    return (
        <div className="map-view">
            <div className="map-fullscreen">
                <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="OpenStreetMap">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenTopoMap contributors"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                    <Marker position={[51.505, -0.09]}>
                        <Popup>
                            <strong>Land Plot</strong>: $200,000<br />
                            <button onClick={() => alert("Details coming soon!")}>More Info</button>
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
        </div>
    );
}

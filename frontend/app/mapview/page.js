'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.vectorgrid';
import './MapView.css';

function VectorTileLayer({ url, layerId }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !url || !layerId) return;

    const vectorLayer = L.vectorGrid.protobuf(url, {
      vectorTileLayerStyles: {
        [layerId]: {
          fillColor: '#3388ff',
          color: '#3388ff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.3,
        },
      },
    }).addTo(map);

    return () => {
      map.removeLayer(vectorLayer);
    };
  }, [map, url, layerId]);

  return null;
}

export default function MapView() {
  const [layers, setLayers] = useState([]);

  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const response = await fetch('http://65.2.140.129:7800/index.json');
        const data = await response.json();
        const layersArray = Object.values(data);
        setLayers(layersArray);
      } catch (error) {
        console.error('Error fetching layers:', error);
      }
    };
    fetchLayers();
  }, []);

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
            {layers.map(layer => (
              <LayersControl.Overlay key={layer.id} name={layer.name}>
                <VectorTileLayer
                  url={`http://65.2.140.129:7800/${layer.id}/{z}/{x}/{y}.pbf`}
                  layerId={layer.id}
                />
              </LayersControl.Overlay>
            ))}
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
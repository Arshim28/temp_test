'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.vectorgrid';
import './MapView.css';

function VectorTileLayer({ layerData }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !layerData) return;

    // Set map view to layer bounds
    const bounds = new L.LatLngBounds(
      [layerData.bounds[1], layerData.bounds[0]],
      [layerData.bounds[3], layerData.bounds[2]]
    );
    map.fitBounds(bounds);

    // Create vector layer with properties from JSON
    const vectorLayer = L.vectorGrid.protobuf(layerData.tileurl, {
      vectorTileLayerStyles: {
        [layerData.id]: {
          fillColor: '#3388ff',
          color: '#3388ff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.3,
        },
      },
      getFeatureId: (f) => f.properties.gid,
      interactive: true,
    }).addTo(map);

    return () => {
      map.removeLayer(vectorLayer);
    };
  }, [map, layerData]);

  return null;
}

export default function MapView() {
  const [availableLayers, setAvailableLayers] = useState([]);
  const [loadedLayers, setLoadedLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState('');

  useEffect(() => {
    const fetchLayerIndex = async () => {
      try {
        const response = await fetch('http://65.2.140.129:7800/index.json');
        const data = await response.json();
        setAvailableLayers(Object.values(data));
      } catch (error) {
        console.error('Error fetching layer index:', error);
      }
    };
    fetchLayerIndex();
  }, []);

  const handleLoadLayer = async () => {
    if (!selectedLayerId || loadedLayers.some(l => l.id === selectedLayerId)) return;

    try {
      const layer = availableLayers.find(l => l.id === selectedLayerId);
      const response = await fetch(layer.detailurl);
      const layerData = await response.json();
      
      setLoadedLayers(prev => [...prev, layerData]);
    } catch (error) {
      console.error('Error loading layer details:', error);
    }
  };

  return (
    <div className="map-view">
      <div className="map-controls">
        <select 
          value={selectedLayerId} 
          onChange={(e) => setSelectedLayerId(e.target.value)}
        >
          <option value="">Select a layer</option>
          {availableLayers.map(layer => (
            <option key={layer.id} value={layer.id}>
              {layer.name} ({layer.geometrytype})
            </option>
          ))}
        </select>
        <button onClick={handleLoadLayer} disabled={!selectedLayerId}>
          Load Layer
        </button>
      </div>

      <div className="map-fullscreen">
        <MapContainer center={[21.0486, 75.5931]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          <LayersControl position="topright">
            {loadedLayers.map(layerData => (
              <LayersControl.Overlay 
                key={layerData.id} 
                name={`${layerData.name} (${layerData.geometrytype})`}
              >
                <VectorTileLayer layerData={layerData} />
              </LayersControl.Overlay>
            ))}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
}
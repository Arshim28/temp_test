'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';

export default function MapView() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [layers, setLayers] = useState([]);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [loadedLayer, setLoadedLayer] = useState(null);
    const metadataRef = useRef(null); // Use a ref for metadata

    useEffect(() => {
        const fetchLayers = async () => {
            try {
                const response = await fetch('http://65.2.140.129:7800/index.json');
                if (!response.ok) throw new Error('Failed to fetch layers');
                const data = await response.json();
                console.log('Fetched layers:', data);
                setLayers(Object.values(data));
            } catch (error) {
                console.error('Error fetching layers:', error);
            }
        };
        fetchLayers();
    }, []);

    useEffect(() => {
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
                version: 8,
                sources: {
                    'basemap': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap'
                }]
            },
            center: [75.7139, 21.0486],
            zoom: 12
        });

        mapRef.current = map;
        return () => map.remove();
    }, []);

    const loadLayer = async () => {
        if (!selectedLayer || !mapRef.current) return;
        const map = mapRef.current;

        // Remove the previously loaded layer if it exists
        if (loadedLayer) {
            map.removeLayer('coord-debug');
            map.removeSource('dynamic-source');
        }

        // Fetch metadata for the selected layer
        try {
            const response = await fetch(`http://65.2.140.129:7800/${selectedLayer.id}.json`);
            if (!response.ok) throw new Error('Failed to fetch metadata');
            const data = await response.json();
            const geometryType = data
            console.log('Fetched metadata:', data);
            metadataRef.current = data; // Update the ref with the latest metadata
        } catch (error) {
            console.error('Error fetching metadata:', error);
            metadataRef.current = null; // Reset the ref if fetching fails
        }

        let geometryType = metadataRef.current?.geometrytype;
        if (!geometryType) {
            console.error("Geometry type is missing from metadata.");
            return;
        }

        let layerType, _paint = {};

        if (geometryType === "Point" || geometryType === "MultiPoint") {
            layerType = "circle";
            _paint = {
                "circle-radius": 6,
                "circle-color": "#ff0000"
            };
        } else if (geometryType === "LineString" || geometryType === "MultiLineString") {
            layerType = "line";
            _paint = {
                "line-width": 2,
                "line-color": "#0000ff"
            };
        } else if (geometryType === "Polygon" || geometryType === "MultiPolygon" || geometryType === "Geometry") {
            layerType = "fill";
            _paint = {
                'fill-color': '#0080FF',
                'fill-opacity': 0.2,
                'fill-outline-color': '#0000FF'
            };
        } else {
            console.error("Unsupported geometry type:", geometryType);
            return;
        }

        // Add the new layer
        map.addSource('dynamic-source', {
            type: 'vector',
            tiles: [`http://65.2.140.129:7800/${selectedLayer.id}/{z}/{x}/{y}.pbf`],
            minzoom: 0,
            maxzoom: 22
        });

        map.addLayer({
            id: 'coord-debug',
            type: layerType,
            source: 'dynamic-source',
            'source-layer': selectedLayer.id,
            paint: _paint
        });

        // Add click event listener to show metadata in a popup
        map.on('click', 'coord-debug', (e) => {
            if (!metadataRef.current) {
                console.error('Metadata not loaded');
                return;
            }

            const features = map.queryRenderedFeatures(e.point, { layers: ['coord-debug'] });
            if (features.length > 0) {
                const feature = features[0];
                const properties = feature.properties;

                // Create a popup
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(
                        `<div>
              <h3>${selectedLayer.name}</h3>
              <ul>
                ${metadataRef.current.properties.map(prop => `
                  <li><strong>${prop.name}</strong>: ${properties[prop.name] || 'N/A'}</li>
                `).join('')}
              </ul>
            </div>`
                    )
                    .addTo(map);
            }
        });

        // Change cursor to pointer when hovering over points
        map.on('mouseenter', 'coord-debug', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change cursor back to default when not hovering over points
        map.on('mouseleave', 'coord-debug', () => {
            map.getCanvas().style.cursor = '';
        });

        setLoadedLayer(selectedLayer);
    };

    const removeLayer = () => {
        if (!mapRef.current || !loadedLayer) return;
        const map = mapRef.current;

        // Remove the layer and source
        map.removeLayer('coord-debug');
        map.removeSource('dynamic-source');

        // Remove event listeners
        map.off('click', 'coord-debug');
        map.off('mouseenter', 'coord-debug');
        map.off('mouseleave', 'coord-debug');

        // Reset the loaded layer state
        setLoadedLayer(null);
        metadataRef.current = null; // Reset the ref
    };

    return (
        <div className="map-container">
            <div className="controls">
                <select onChange={(e) => setSelectedLayer(layers.find(layer => layer.id === e.target.value))}>
                    <option value="">Select a Layer</option>
                    {layers.map(layer => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                    ))}
                </select>
                <button onClick={loadLayer} disabled={!selectedLayer}>Load Layer</button>
                <button onClick={removeLayer} disabled={!loadedLayer}>Remove Layer</button>
            </div>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
        </div>
    );
}
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
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [showDistrictPopup, setShowDistrictPopup] = useState(false);
    const metadataRef = useRef(null);
    const [mapStyle, setMapStyle] = useState('base');
    const [expandedSidebar, setExpandedSidebar] = useState(false); // Track sidebar expansion


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
        const fetchDistricts = async () => {
            try {
                const response = await fetch('http://65.2.140.129:8000/api/maharashtra-hierarchy/');
                if (!response.ok) throw new Error('Failed to fetch districts');
                const data = await response.json();
                console.log('Fetched districts:', data);

                // Extract district names from the hierarchy
                const districtNames = data.map(district => district.name);
                setDistricts(districtNames);
            } catch (error) {
                console.error('Error fetching districts:', error);
            }
        };
        fetchDistricts();
    }, []);

    useEffect(() => {
        const mapStyles = {
            base: {
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
            satellite: {
                version: 8,
                sources: {
                    'satellite': {
                        type: 'raster',
                        tiles: ['https://{a-c}.basemaps.cartocdn.com/rastertiles/satellite/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'satellite',
                    type: 'raster',
                    source: 'satellite'
                }]
            },
            hybrid: {
                version: 8,
                sources: {
                    'hybrid': {
                        type: 'vector',
                        tiles: ['https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{x}/{y}.pbf'],
                        minzoom: 0,
                        maxzoom: 16
                    }
                },
                layers: [{
                    id: 'hybrid-layer',
                    type: 'fill',  // Here we use 'fill' for polygons. Adjust as necessary for your use case.
                    source: 'hybrid',
                    'source-layer': 'reference', // Replace with the correct layer name from the vector tiles.
                    paint: {
                        'fill-color': '#0080FF',
                        'fill-opacity': 0.2,
                        'fill-outline-color': '#0000FF'
                    }
                }, {
                    id: 'hybrid-line',
                    type: 'line',  // Use 'line' for line geometries, adjust as needed.
                    source: 'hybrid',
                    'source-layer': 'reference', // Replace with the correct layer name.
                    paint: {
                        'line-color': '#0000FF',
                        'line-width': 2
                    }
                }]
            }
        };
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            // style: {
            //   version: 8,
            //   sources: {
            //     'basemap': {
            //       type: 'raster',
            //       tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            //       tileSize: 256
            //     }
            //   },
            //   layers: [{
            //     id: 'basemap',
            //     type: 'raster',
            //     source: 'basemap'
            //   }]
            // },
            style: mapStyles[mapStyle],
            center: [75.7139, 21.0486],
            zoom: 12
        });

        mapRef.current = map;
        return () => map.remove();
    }, [mapStyle]);

    const loadLayer = async () => {
        if (!selectedLayer || !mapRef.current) return;
        const map = mapRef.current;

        if (loadedLayer) {
            map.removeLayer('coord-debug');
            map.removeSource('dynamic-source');
        }

        try {
            const response = await fetch(`http://65.2.140.129:7800/${selectedLayer.id}.json`);
            if (!response.ok) throw new Error('Failed to fetch metadata');
            const data = await response.json();
            console.log('Fetched metadata:', data);
            metadataRef.current = data;
        } catch (error) {
            console.error('Error fetching metadata:', error);
            metadataRef.current = null;
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
        } else if (geometryType === "LineString" || geometryType === "MultiLineString" || geometryType === "MultiCurve") {
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

        map.on('click', 'coord-debug', (e) => {
            if (!metadataRef.current) {
                console.error('Metadata not loaded');
                return;
            }

            const features = map.queryRenderedFeatures(e.point, { layers: ['coord-debug'] });
            if (features.length > 0) {
                const feature = features[0];
                const properties = feature.properties;

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

        map.on('mouseenter', 'coord-debug', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'coord-debug', () => {
            map.getCanvas().style.cursor = '';
        });

        setLoadedLayer(selectedLayer);
    };

    const removeLayer = () => {
        if (!mapRef.current || !loadedLayer) return;
        const map = mapRef.current;

        map.removeLayer('coord-debug');
        map.removeSource('dynamic-source');

        map.off('click', 'coord-debug');
        map.off('mouseenter', 'coord-debug');
        map.off('mouseleave', 'coord-debug');

        setLoadedLayer(null);
        metadataRef.current = null;
    };

    const handleSatelliteChange = () => {
        setMapStyle('satellite'); // Switch to satellite view
    };

    const handleHybridChange = () => {
        setMapStyle('hybrid'); // Switch to hybrid view
    };

    const handleBaseChange = () => {
        setMapStyle('base'); // Switch to base (street) view
    };


    const handleLoadLayersClick = () => {
        setExpandedSidebar(true); // Expand sidebar when "Load Layers" is clicked
        setShowDistrictPopup(true); // Show district selector
    };

    return (
        <div className="map-container">
            {/* Sidebar */}
            <div className={`sidebar ${expandedSidebar ? 'expanded' : ''}`}>
                <button
                    className="navbar-icon"
                    onClick={handleLoadLayersClick}
                >
                    <span role="img" aria-label="layers">🗂️ Load Layers</span>
                    {/* <div>Load Layers</div> */}
                </button>



                {/* District selection */}
                {showDistrictPopup && (
                    <div className="district-selector">
                        <h3 className="district-header">Select District</h3>
                        <select onChange={(e) => setSelectedDistrict(e.target.value)}>
                            <option value="">Select a District</option>
                            {districts.map(district => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Layer options */}
                {selectedDistrict && (
                    <div className="layers-list">
                        <h3 className="district-header">Select Layers</h3>
                        {layers.map(layer => (
                            <div
                                key={layer.id}
                                className="layer-option"
                                onClick={() => setSelectedLayer(layer)}
                            >
                                {layer.name}
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls for adding/removing layers */}
                {selectedDistrict && selectedLayer && (
                    <div className="controls">
                        <button onClick={loadLayer}>Load Layer</button>
                        <button onClick={removeLayer}>Remove Layer</button>
                        {/* <button onClick={addLayer}>Add Layer</button> */}
                    </div>
                )}

                <button className="navbar-icon" onClick={() => alert('Download report functionality to be implemented')}>
                    <span role="img" aria-label="download">📥 Download Report</span>
                    {/* <div>Download Report</div> */}
                </button>
            </div>

            {/* Map Wrapper */}
            <div className="map-wrapper">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
            </div>
        </div>
    );
}
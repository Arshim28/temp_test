'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]);  // Store active layers
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [showDistrictPopup, setShowDistrictPopup] = useState(false);
  const metadataRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('base');
  const [expandedSidebar, setExpandedSidebar] = useState(false);

  // Fetch layers
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const response = await fetch('http://65.2.140.129:7800/index.json');
        if (!response.ok) throw new Error('Failed to fetch layers');
        const data = await response.json();
        setLayers(Object.values(data));
      } catch (error) {
        console.error('Error fetching layers:', error);
      }
    };
    fetchLayers();
  }, []);

  // Fetch districts
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const response = await fetch('http://65.2.140.129:8000/api/maharashtra-hierarchy/');
        if (!response.ok) throw new Error('Failed to fetch districts');
        const data = await response.json();
        const districtNames = data.map(district => district.name);
        setDistricts(districtNames);
      } catch (error) {
        console.error('Error fetching districts:', error);
      }
    };
    fetchDistricts();
  }, []);

  // Map style setup
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
          type: 'fill',
          source: 'hybrid',
          'source-layer': 'reference',
          paint: {
            'fill-color': '#0080FF',
            'fill-opacity': 0.2,
            'fill-outline-color': '#0000FF'
          }
        }, {
          id: 'hybrid-line',
          type: 'line',
          source: 'hybrid',
          'source-layer': 'reference',
          paint: {
            'line-color': '#0000FF',
            'line-width': 2
          }
        }]
      }
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyles[mapStyle],
      center: [75.7139, 21.0486],
      zoom: 12
    });

    mapRef.current = map;
    return () => map.remove();
  }, [mapStyle]);

  // Load a selected layer
  const loadLayer = async (layer) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Add layer only if it's not already added
    if (!activeLayers.find(activeLayer => activeLayer.id === layer.id)) {
      try {
        const response = await fetch(`http://65.2.140.129:7800/${layer.id}.json`);
        if (!response.ok) throw new Error('Failed to fetch metadata');
        const data = await response.json();
        metadataRef.current = data;
      } catch (error) {
        console.error('Error fetching metadata:', error);
        return;
      }

      let geometryType = metadataRef.current?.geometrytype;
      if (!geometryType) return;

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
      } else if (geometryType === "Polygon") {
        layerType = "fill";
        _paint = {
          'fill-color': '#0080FF',
          'fill-opacity': 0.2,
          'fill-outline-color': '#0000FF'
        };
      }

      map.addSource(layer.id, {
        type: 'vector',
        tiles: [`http://65.2.140.129:7800/${layer.id}/{z}/{x}/{y}.pbf`],
        minzoom: 0,
        maxzoom: 22
      });

      map.addLayer({
        id: `layer-${layer.id}`,
        type: layerType,
        source: layer.id,
        'source-layer': layer.id,
        paint: _paint
      });

      setActiveLayers(prevState => [...prevState, layer]);  // Add the layer to active layers state
    }
  };

  // Remove selected layer
  const removeLayer = (layer) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove the layer from map
    map.removeLayer(`layer-${layer.id}`);
    map.removeSource(layer.id);

    // Remove layer from active layers state
    setActiveLayers(prevState => prevState.filter(activeLayer => activeLayer.id !== layer.id));
  };

  // Handle layer click
  const handleLayerClick = (layer) => {
    loadLayer(layer);
  };

  // Handle layer double-click
  const handleLayerDoubleClick = (layer) => {
    removeLayer(layer);
  };

  // Handle remove layer button click
  const handleRemoveLayerClick = (layer) => {
    removeLayer(layer);
  };

  // Handle load layers click (expand sidebar)
  const handleLoadLayersClick = () => {
    setExpandedSidebar(true);
    setShowDistrictPopup(true);
  };

  return (
    <div className="map-container">
      <div className={`sidebar ${expandedSidebar ? 'expanded' : ''}`}>
        <button className="navbar-icon" onClick={handleLoadLayersClick}>
          <span role="img" aria-label="layers">🗂️ Load Layers</span>
        </button>

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

        {selectedDistrict && (
          <div className="layers-list">
            <h3 className="district-header">Select Layers</h3>
            {layers.map(layer => (
              <div
                key={layer.id}
                className={`layer-option ${activeLayers.some(activeLayer => activeLayer.id === layer.id) ? 'active' : ''}`}
                onClick={() => handleLayerClick(layer)}
                onDoubleClick={() => handleLayerDoubleClick(layer)}
              >
                {layer.name}
                <button className="remove-layer" onClick={(e) => { e.stopPropagation(); handleRemoveLayerClick(layer); }}>
                  ✖️
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="navbar-icon" onClick={() => alert('Download report functionality to be implemented')}>
          <span role="img" aria-label="download">📥 Download Report</span>
        </button>
      </div>

      <div className="map-wrapper">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
      </div>
    </div>
  );
}

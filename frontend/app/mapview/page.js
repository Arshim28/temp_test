'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const router = useRouter();


  const handleUnauthorizedAccess = () => {
    setShowLoginPopup(true);
    setTimeout(() => {
      setShowLoginPopup(false);
      router.push('/login'); // Redirect to login page
    }, 1000);
  };
  const token = localStorage.getItem('authToken');
  // Fetch layers
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      handleUnauthorizedAccess();
    }
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
  }, [token]);

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


      map.on('click', `layer-${layer.id}`, (e) => {
        const feature = e.features[0];
        if (feature) {
          const point = map.project(e.lngLat); // Convert to screen coordinates
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const popupWidth = 200;  // Estimated width of popup
          const popupHeight = 120; // Estimated height of popup

          let posX = point.x;
          let posY = point.y;

          // Adjust position dynamically to keep the popup within screen bounds
          if (point.y - popupHeight < 0) {
            // If popup goes out of top screen, place it below
            posY += 20;
          } else {
            // Otherwise, place it above
            posY -= popupHeight + 10;
          }

          if (point.x + popupWidth > screenWidth) {
            // If popup goes out of right screen, move it left
            posX -= popupWidth + 10;
          } else if (point.x - popupWidth < 0) {
            // If popup goes out of left screen, move it right
            posX += 20;
          }

          setPopupInfo({
            screenX: posX,
            screenY: posY,
            properties: feature.properties
          });
        }
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

    if (popupInfo) {
      setPopupInfo(null);
    }

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
      {showLoginPopup && (
        <div className="popup">
          <div className="popup-content">
            <p>🔒 Please login to continue</p>
          </div>
        </div>
      )}
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
        <button className="navbar-icon" onClick={() => router.push('/dashboard')}>
          <span role="img" aria-label="dashboard">🏠 Go to Dashboard</span>
        </button>


      </div>


      <div className="map-wrapper">

        <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />

        {popupInfo && (
          <div
            className="feature-popup"
            style={{
              position: "absolute",
              left: `${popupInfo.screenX}px`,
              top: `${popupInfo.screenY}px`,
              transform: "translate(-50%, -50%)", // Center popup
            }}
          >
            <div className="popup-header">
              <h4>Feature Details</h4>
              <button onClick={() => setPopupInfo(null)}>✖</button>
            </div>
            <div className="popup-content">
              {Object.entries(popupInfo.properties).map(([key, value]) => (
                <p key={key}><strong>{key}:</strong> {value}</p>
              ))}
            </div>
          </div>
        )}


      </div>
      {/* Styles for the popup */}
      <style jsx>{`
                .popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 20px;
                    border-radius: 10px;
                    color: white;
                    font-size: 18px;
                    text-align: center;
                    animation: fadeIn 0.3s ease-in-out;
                    z-index: 1000;
                    width: 300px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                }

                .popup-content {
                    padding: 10px;
                    color: black;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -55%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>


    </div>
  );
}

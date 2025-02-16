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
  const [mapStyle, setMapStyle] = useState('base'); // Default is base (street map)
  const [expandedSidebar, setExpandedSidebar] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedFeatureData, setSelectedFeatureData] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [khataNos, setKhataNos] = useState([]);
  const [selectedKhataNo, setSelectedKhataNo] = useState("");
  const [showKhataWarning, setShowKhataWarning] = useState(false);
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

  // Map style setup (recreates map when mapStyle changes)
  useEffect(() => {
    const mapStyles = {
      base: {
        version: 8,
        sources: {
          'basemap': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}'],
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
            tiles: ['https://www.google.com/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}'],
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
            tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
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
    var tileUrl = "";

    // Add layer only if it's not already added
    if (!activeLayers.find(activeLayer => activeLayer.id === layer.id)) {
      try {
        // Fetch tile URL token from API
        const res = await fetch(`http://65.2.140.129:8000/api/get_tile_url/?table=${layer.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data1 = await res.json();
        console.log("Parsed Response:", data1);
        tileUrl = data1.tile_url;
        console.log("Tile URL:", tileUrl);

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
        tiles: [tileUrl],
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
          setSelectedFeatureData(feature.properties);

          const { khata_no } = feature.properties.khata_no;
          console.log("khatas: ", khata_no);

          if (khata_no) {
            const parsedKhataNos = khata_no.split(",").map(k => k.trim());
            setKhataNos(parsedKhataNos);
            console.log("Khatas2: ", parsedKhataNos);
          } else {
            setKhataNos([]); // No khata info
          }

          // Reset selected khata and hide warning
          setSelectedKhataNo("");
          setShowKhataWarning(false);
        }
      });

      setActiveLayers(prevState => [...prevState, layer]);  // Add the layer to active layers state
      setSelectedLayer(layer);
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

  const handleDownload = async () => {
    if (!selectedFeatureData) return;
    if (!selectedKhataNo) {
      setShowKhataWarning(true);
      return;
    }

    const state = "Maharashtra";
    const district = selectedDistrict || "";
    let taluka = "";
    if(selectedLayer.id && selectedLayer.id.includes("_cadastrals")) {
        taluka = selectedLayer.id.split("_cadastrals")[0].split(".")[1];
    }
    const village = selectedFeatureData?.vil_name || "";
    let khata_no = selectedKhataNo;
  
    // 2. Construct the URL with query parameters
    const Url = `http://65.2.140.129:8000/api/report-gen/?state=${state}&district=${district}&taluka=${taluka}&village=${village}&khata_no=${khata_no}`;
  
    console.log("url: ", Url);
    // 3. Fetch the report (assuming PDF or other binary content)
    try {
      const response = await fetch(Url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to fetch report. Status: ${response.status}`);
      }
  
      // 4. Convert response to Blob
      const blob = await response.blob();
  
      // 5. Create a download link and trigger it
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "report.pdf"; // Or dynamically generate a filename
      link.click();
  
      // 6. Cleanup
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error downloading report:", err);
    }
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

        <div className="map-style-selector">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <option value="base">Street Map</option>
            <option value="satellite">Satellite</option>
            {/* Optionally, add hybrid view if desired:
            <option value="hybrid">Hybrid</option>
            */}
          </select>
        </div>

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

        {selectedFeatureData && (
            <div className="right-sidebar">
                {showKhataWarning && (
                  <div className="popup-warning">
                    <p>Please select a khata no.</p>
                  </div>
                )}

                <button
                className="close-button"
                onClick={() => setSelectedFeatureData(null)}
                >
                ✖
                </button>
                <button className="download-button" onClick={() => handleDownload()}>
                Download Report
                </button>
                {khataNos.length > 0 && (
                  <div className="khata-dropdown">
                    <label>Select Khata No: </label>
                    <select
                      value={selectedKhataNo}
                      onChange={(e) => {
                        setSelectedKhataNo(e.target.value);
                        // Hide the warning if user changed selection
                        setShowKhataWarning(false);
                      }}
                    >
                      <option value="">--Select--</option>
                      {khataNos.map((khata) => (
                        <option key={khata} value={khata}>{khata}</option>
                      ))}
                    </select>
                  </div>
                )}
                <h3>Feature Information</h3>
                <div className="feature-details">
                {Object.entries(selectedFeatureData).map(([key, value]) => (
                    <p key={key}>
                    <strong>{key}:</strong> {value}
                    </p>
                ))}
                </div>

                
            </div>
        )}

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

        .right-sidebar {
            position: absolute;
            top: 0;
            right: 0;  /* sticks to the right side */
            width: 300px;
            height: 100vh;
            background-color: #fff;
            border-left: 1px solid #ccc;
            padding: 16px;
            overflow-y: auto;
            box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
            z-index: 999; /* ensure it's above the map */
            }

            .close-button {
            background: transparent;
            border: none;
            float: right;
            font-size: 18px;
            cursor: pointer;
            }

            .feature-details p {
            margin: 4px 0;
            }

            .download-button {
            margin-top: 10px;
            background-color: #2196f3;
            color: #fff;
            padding: 8px 12px;
            border: none;
            cursor: pointer;
            }

            .download-button:hover {
            background-color: #0b79d0;
            }

            .popup-warning {
              position: absolute;
              top: 20px;
              right: 20px;
              background: #ffdddd;
              color: #900;
              padding: 10px 15px;
              border: 1px solid #900;
              border-radius: 4px;
              z-index: 10000;
            }


        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -55%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}

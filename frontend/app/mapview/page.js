'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';
import * as turf from '@turf/turf';

// Import API services
import {
  fetchLayers,
  fetchDistricts,
  fetchTileUrl,
  fetchMetadata,
  fetchFeaturesByLatLng,
  fetchLayerExtent,
  fetchFeaturesByPoint,
  searchByAddress,
  createCQLFilter
} from './api';

// Import components
import {
  LayerControl,
  FeaturePanel,
  SearchPanel,
  FilterPanel,
  MeasurementTools,
  HeatmapControl,
  LegendPanel,
  ExportTools,
  MapStyleControl,
  LoadingIndicator
} from './components';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.204.226.30:8001/api';
const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || 'http://43.204.226.30:7800';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_CENTER = [75.7139, 21.0486];
const DEFAULT_ZOOM = 12;

// Debug function to check network availability
const checkApiAvailability = async () => {
  try {
    console.log("Checking API availability...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/health-check`, {
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("API is available");
      return true
    } else {
      console.erro("API returned status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("API connectivity check failed:", error.message);
    return false;
  }
};

// Enhanced error display component
const ErrorMessage = ({ error, onDismiss }) => (
  <div className="error-message" style={{
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    maxWidth: '80%'
  }}>
    <p>{error}</p>
    <button onClick={onDismiss}>Dismiss</button>
  </div>
);

// MapView Component
export default function MapView() {
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const metadataCache = useRef({});
  const popupRef = useRef(null);
  const markerRef = useRef(null);
  const drawRef = useRef(null);
  const measurementLayerRef = useRef(null);

  // Router
  const router = useRouter();

  // Base State
  const [mapStyle, setMapStyle] = useState('base');
  const [layers, setLayers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]);
  const [layerOrder, setLayerOrder] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  // UI State
  const [expandedSidebar, setExpandedSidebar] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('layers'); // 'layers', 'search', 'feature', 'filter', 'measurement', 'heatmap', 'export'
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  // Feature Info State
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [khataNos, setKhataNos] = useState([]);
  const [featureCollection, setFeatureCollection] = useState([]);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [infoModeActive, setInfoModeActive] = useState(false);

  //layer
  const [layerPopupOpen, setLayerPopupOpen] = useState(false);
  // Search State
  const [searchCoords, setSearchCoords] = useState({ latitude: '', longitude: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Filter State
  const [filterDefinitions, setFilterDefinitions] = useState({});
  const [filterActiveLayer, setFilterActiveLayer] = useState(null);

  // Measurement State
  const [measurementActive, setMeasurementActive] = useState(false);
  const [measurementType, setMeasurementType] = useState('distance'); // 'distance', 'area'
  const [measurementResult, setMeasurementResult] = useState(null);

  // Heatmap State
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [heatmapLayer, setHeatmapLayer] = useState(null);
  const [heatmapProperty, setHeatmapProperty] = useState('');
  const [heatmapColorScheme, setHeatmapColorScheme] = useState('YlOrRd');

  // Export State
  const [exportOptions, setExportOptions] = useState({
    includeMap: true,
    includeAttributes: true,
    includeTitle: true,
    title: 'Map Export'
  });

  // Check API availability when component mounts
  // useEffect(() => {
  //   const checkApi = async () => {
  //     const available = await checkApiAvailability();
  //     setApiAvailable(available);
  //     if (!available) {
  //       setError("API server is not responding. Map functionality will be limited.");
  //     }
  //   };

  //   checkApi();
  // }, []);

  // Initialize token from localStorage with better error handling
  useEffect(() => {
    try {
      console.log("Checking for authentication token...");
      const storedToken = localStorage.getItem('authToken');

      if (storedToken) {
        console.log("Authentication token found");
        setToken(storedToken);
      } else {
        console.error("No authentication token found in localStorage");
        setError("Authentication required. Please login.");
        handleUnauthorizedAccess();
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      setError("Failed to access authentication storage. Please ensure cookies are enabled.");
    }
  }, []);

  // Fetch layers and districts when component mounts and token is available
  useEffect(() => {
    if (!token) {
      console.log("Skipping initial data load - no token available");
      return;
    }

    if (!apiAvailable) {
      console.log("Skipping initial data load - API not available");
      return;
    }

    console.log("Token is available, loading initial data...");

    const loadInitialData = async () => {
      try {
        console.log("Loading initial data (layers and districts)");
        setIsLoading(true);

        // Debug the API URL
        console.log(`API Base URL: ${API_BASE_URL}`);
        console.log(`Tile Server URL: ${TILE_SERVER_URL}`);

        // First try to fetch layers
        console.log(`Fetching layers from ${TILE_SERVER_URL}`);
        let layersData;
        try {
          layersData = await fetchLayers(TILE_SERVER_URL);
          console.log("Layers fetched successfully:", layersData);
        } catch (layerError) {
          console.error("Error fetching layers:", layerError);
          layersData = [];
          // Don't set a global error yet, try to fetch districts
        }

        // Then try to fetch districts
        console.log(`Fetching districts from ${API_BASE_URL}`);
        let districtsData;
        try {
          districtsData = await fetchDistricts(API_BASE_URL, token);
          console.log("Districts fetched successfully:", districtsData);
        } catch (districtError) {
          console.error("Error fetching districts:", districtError);
          districtsData = [];
          // Don't set a global error yet, use what we have
        }

        // Update state with whatever we got
        if (layersData.length > 0) {
          setLayers(layersData);
        } else {
          console.warn("No layers were fetched");
        }

        if (districtsData.length > 0) {
          setDistricts(districtsData);
        } else {
          console.warn("No districts were fetched");
        }

        // Only set error if both failed
        if (layersData.length === 0 && districtsData.length === 0) {
          throw new Error("Failed to load both layers and districts data");
        }

      } catch (err) {
        const errorMsg = `Failed to load initial data: ${err.message}`;
        console.error(errorMsg, err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [token, apiAvailable]);

  // Handle unauthorized access
  const handleUnauthorizedAccess = useCallback(() => {
    console.log("Handling unauthorized access");
    setShowLoginPopup(true);
    setTimeout(() => {
      setShowLoginPopup(false);
      console.log("Redirecting to login page...");
      router.push('/login');
    }, 3000); // Longer timeout for visibility
  }, [router]);

  // Initialize map based on mapStyle with improved error handling
  useEffect(() => {
    router.push('/dashboard');
    if (!mapContainerRef.current) {
      console.error("Map container ref is not available");
      return;
    }

    console.log("Initializing map with style:", mapStyle);

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
            type: 'raster',
            tiles: ['https://www.google.com/maps/vt/lyrs=y&x={x}&y={y}&z={z}'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'hybrid',
          type: 'raster',
          source: 'hybrid'
        }]
      },
      topographic: {
        version: 8,
        sources: {
          'topographic': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'topographic',
          type: 'raster',
          source: 'topographic'
        }]
      }
    };

    // If map already exists, remove it
    if (mapRef.current) {
      try {
        console.log("Removing existing map");
        mapRef.current.remove();
      } catch (e) {
        console.error("Error removing map:", e);
      }
    }

    try {
      console.log("Creating new map instance");
      // Create new map
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyles[mapStyle],
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true
      });

      // Add navigation control
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add scale control
      map.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        }),
        'bottom-left'
      );

      // Add fullscreen control
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');

      // Add geolocate control
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-right'
      );

      // Create a popup instance
      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px'
        });
      }

      // Set map reference
      mapRef.current = map;

      // Add debug for map load
      map.on('load', () => {
        console.log("Map loaded successfully");
      });

      // Add debug for map errors
      map.on('error', (e) => {
        console.error("Map error:", e);
        setError(`Map error: ${e.error.message || 'Unknown error'}`);
      });

      // Add click event listener with improved debugging
      map.on('click', (e) => {
        console.log("Map clicked at:", e.lngLat);

        if (infoModeActive) {
          console.log("Info mode is active, handling feature info request");
          handleFeatureInfoRequest(e);
        }

        if (measurementActive) {
          console.log("Measurement is active, handling measurement click");
          handleMeasurementClick(e);
        }
      });

      // Reload active layers when map is ready
      map.once('load', () => {
        console.log("Map loaded, checking for active layers to reload");
        if (activeLayers.length > 0) {
          console.log(`Reloading ${activeLayers.length} active layers`);
          activeLayers.forEach(layer => loadLayer(layer));
        } else {
          console.log("No active layers to reload");
        }
      });

    } catch (err) {
      console.error("Error initializing map:", err);
      setError(`Failed to initialize map: ${err.message}`);
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        console.log("Cleaning up map");
        try {
          mapRef.current.remove();
        } catch (err) {
          console.error("Error during map cleanup:", err);
        }
      }
    };
  }, [mapStyle]);

  // Load a layer onto the map with improved debugging and error handling
  const loadLayer = async (layer) => {
    console.log(`loadLayer called for layer: ${layer.id}`);

    if (!mapRef.current) {
      console.error("Map reference is not available");
      setError("Map not initialized. Please refresh the page.");
      return;
    }

    if (!token) {
      console.error("Authentication token is not available");
      setError("Authentication required to load layers. Please login.");
      handleUnauthorizedAccess();
      return;
    }

    const map = mapRef.current;

    // Check if map is loaded
    if (!map.loaded()) {
      console.log("Map not fully loaded yet, waiting for load event");
      map.once('load', () => {
        console.log("Map now loaded, proceeding with layer load");
        loadLayer(layer); // Retry once map is loaded
      });
      return;
    }

    // Skip if layer is already loaded
    if (activeLayers.find(activeLayer => activeLayer.id === layer.id)) {
      console.log(`Layer ${layer.id} is already loaded, selecting it`);
      setSelectedLayer(layer);
      return;
    }

    try {
      console.log(`Starting to load layer: ${layer.id}`);
      setIsLoading(true);
      setError(null);

      // Fetch tile URL with authentication token
      console.log(`Fetching tile URL for layer ${layer.id} from ${API_BASE_URL}`);
      let tileUrl;
      try {
        tileUrl = await fetchTileUrl(API_BASE_URL, layer.id, token);
        console.log(`Tile URL obtained: ${tileUrl}`);
      } catch (urlError) {
        console.error("Error fetching tile URL:", urlError);
        throw new Error(`Failed to get tile URL: ${urlError.message}`);
      }

      // Fetch layer metadata if not already cached
      if (!metadataCache.current[layer.id]) {
        console.log(`Fetching metadata for layer ${layer.id} from ${TILE_SERVER_URL}`);
        try {
          const metadata = await fetchMetadata(TILE_SERVER_URL, layer.id);
          console.log(`Metadata obtained for layer ${layer.id}:`, metadata);
          metadataCache.current[layer.id] = metadata;
        } catch (metadataError) {
          console.error("Error fetching metadata:", metadataError);
          throw new Error(`Failed to get layer metadata: ${metadataError.message}`);
        }
      }

      const metadata = metadataCache.current[layer.id];
      console.log(`Using metadata for layer ${layer.id}:`, metadata);

      const geometryType = metadata?.geometrytype;

      if (!geometryType) {
        console.error(`Geometry type not found for layer: ${layer.name}`);
        throw new Error(`Geometry type not found for layer: ${layer.name || layer.id}`);
      }

      console.log(`Layer ${layer.id} has geometry type: ${geometryType}`);

      // Configure layer based on geometry type
      let layerType, paint = {};

      switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
          layerType = 'circle';
          paint = {
            'circle-radius': 6,
            'circle-color': '#ff0000',
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          };
          break;

        case 'LineString':
        case 'MultiLineString':
        case 'MultiCurve':
          layerType = 'line';
          paint = {
            'line-width': 2,
            'line-color': '#0000ff',
            'line-opacity': 0.8
          };
          break;

        case 'Polygon':
        case 'MultiPolygon':
        case 'Geometry':
          layerType = 'fill';
          paint = {
            'fill-color': '#0080FF',
            'fill-opacity': 0.4,
            'fill-outline-color': '#0000FF'
          };
          break;

        default:
          console.error(`Unsupported geometry type: ${geometryType}`);
          throw new Error(`Unsupported geometry type: ${geometryType}`);
      }

      // Add source and layer to map
      const sourceId = `source-${layer.id}`;
      const layerId = `layer-${layer.id}`;

      // Check if source already exists, remove it if it does
      if (map.getSource(sourceId)) {
        console.log(`Source ${sourceId} already exists, removing it`);
        map.removeLayer(layerId);
        map.removeSource(sourceId);
      }

      // Apply filter if exists for this layer
      let filter = null;
      if (filterDefinitions[layer.id]) {
        filter = createCQLFilter(filterDefinitions[layer.id]);
        console.log(`Applied filter to layer ${layer.id}:`, filter);
      }

      // Construct the final tile URL
      const finalTileUrl = filter ?
        `${tileUrl}&cql_filter=${encodeURIComponent(filter)}` :
        tileUrl;

      console.log(`Final tile URL for layer ${layer.id}: ${finalTileUrl}`);

      // Debug: try to fetch the tile URL to see if it's valid
      try {
        const tileCheck = await fetch(finalTileUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'));
        if (!tileCheck.ok) {
          console.warn(`Tile URL check failed with status: ${tileCheck.status}`);
        } else {
          console.log("Tile URL check successful");
        }
      } catch (tileCheckError) {
        console.warn("Tile URL check failed:", tileCheckError);
      }

      // Add source
      console.log(`Adding source ${sourceId} to map`);
      try {
        map.addSource(sourceId, {
          type: 'vector',
          tiles: [finalTileUrl],
          minzoom: 0,
          maxzoom: 22
        });
        console.log(`Source ${sourceId} added successfully`);
      } catch (sourceError) {
        console.error(`Error adding source ${sourceId}:`, sourceError);
        throw new Error(`Failed to add source: ${sourceError.message}`);
      }

      // Add layer
      console.log(`Adding layer ${layerId} to map with type ${layerType}`);
      try {
        map.addLayer({
          id: layerId,
          type: layerType,
          source: sourceId,
          'source-layer': layer.id,
          paint: paint
        });
        console.log(`Layer ${layerId} added successfully`);
      } catch (layerError) {
        console.error(`Error adding layer ${layerId}:`, layerError);
        // Try to clean up the source if layer addition fails
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
        throw new Error(`Failed to add layer: ${layerError.message}`);
      }

      // Verify layer was added successfully
      if (!map.getLayer(layerId)) {
        console.error(`Layer ${layerId} not found after adding`);
        throw new Error(`Layer ${layerId} failed to load properly`);
      }

      // Add click event handler with debugging
      console.log(`Adding click event handler for layer ${layerId}`);
      const clickHandler = (e) => {
        console.log(`Layer ${layerId} clicked:`, e);
        handleFeatureClick(e);
      };

      map.on('click', layerId, clickHandler);

      // Add hover effect
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Update state
      console.log(`Layer ${layer.id} loaded successfully, updating state`);
      setActiveLayers(prev => [...prev, layer]);
      setLayerOrder(prev => [...prev, layer.id]);
      setSelectedLayer(layer);

      // Update other components
      updateLegend();

    } catch (err) {
      const errorMsg = `Failed to load layer ${layer.id || 'unknown'}: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on a feature with improved debugging
  const handleFeatureClick = (e) => {
    console.log("handleFeatureClick called with event:", e);

    if (!mapRef.current) {
      console.error("Map reference not available in handleFeatureClick");
      return;
    }

    if (!infoModeActive) {
      console.log("Info mode not active, ignoring feature click");
      return;
    }

    const feature = e.features && e.features[0];
    if (!feature) {
      console.log("No feature found in click event");
      return;
    }

    console.log("Feature clicked:", feature);

    // Extract khata numbers if available
    const properties = feature.properties;
    const khataNo = properties.khata_no;

    let parsedKhataNos = [];
    if (khataNo) {
      parsedKhataNos = khataNo.split(',').map(k => k.trim());
      console.log("Parsed khata numbers:", parsedKhataNos);
    }

    // Update state
    setSelectedFeature(properties);
    setKhataNos(parsedKhataNos);
    setSidebarMode('feature');
    setExpandedSidebar(true);

    // Fly to feature
    const coordinates = e.lngLat;
    console.log(`Flying to coordinates: ${coordinates.lng}, ${coordinates.lat}`);

    mapRef.current.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      essential: true
    });
  };

  // Load feature info for all layers at a point with improved debugging
  const handleFeatureInfoRequest = async (e) => {
    console.log("handleFeatureInfoRequest called with event:", e);

    if (!mapRef.current) {
      console.error("Map reference not available in handleFeatureInfoRequest");
      return;
    }

    if (!token) {
      console.error("Authentication token not available");
      setError("Authentication required for feature info. Please login.");
      return;
    }

    if (activeLayers.length === 0) {
      console.log("No active layers to query");
      return;
    }

    try {
      console.log("Processing feature info request");
      setIsLoading(true);

      const map = mapRef.current;
      const point = e.lngLat;
      console.log(`Query point: ${point.lng}, ${point.lat}`);

      // Fetch features for all active layers
      console.log(`Fetching features for ${activeLayers.length} active layers`);

      const results = await Promise.all(
        activeLayers.map(async (layer) => {
          try {
            console.log(`Fetching features for layer ${layer.id}`);
            const features = await fetchFeaturesByPoint(
              API_BASE_URL,
              layer.id,
              point.lng,
              point.lat,
              map.getZoom(),
              map.getCanvas().width,
              map.getCanvas().height,
              token
            );

            console.log(`Layer ${layer.id} returned ${features ? features.length : 0} features`);

            if (features && features.length > 0) {
              return features.map(feature => ({
                ...feature,
                _layerName: layer.name || layer.id
              }));
            }
            return [];
          } catch (error) {
            console.error(`Error fetching features for layer ${layer.id}:`, error);
            return [];
          }
        })
      );

      // Flatten results
      const allFeatures = results.flat();
      console.log(`Total features found: ${allFeatures.length}`);

      if (allFeatures.length > 0) {
        console.log("Features found, updating UI");
        setFeatureCollection(allFeatures);
        setCurrentFeatureIndex(0);
        setSelectedFeature(allFeatures[0]);
        setSidebarMode('feature');
        setExpandedSidebar(true);
      } else {
        console.log("No features found, showing popup");
        popupRef.current
          .setLngLat(point)
          .setHTML("<p>No features found at this location</p>")
          .addTo(map);
      }
    } catch (err) {
      const errorMsg = `Feature info request failed: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle info mode with debugging
  const toggleInfoMode = () => {
    console.log(`Toggling info mode from ${infoModeActive} to ${!infoModeActive}`);
    setInfoModeActive(!infoModeActive);

    // Update cursor
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = !infoModeActive ? 'help' : '';
      console.log(`Updated cursor to ${!infoModeActive ? 'help' : 'default'}`);
    }

    // Turn off other tools
    if (!infoModeActive) {
      console.log("Turning off other tools as info mode is being activated");
      setMeasurementActive(false);
      setHeatmapActive(false);
    }
  };

  // Navigate between features in feature collection
  const navigateFeatures = (direction) => {
    if (featureCollection.length <= 1) {
      console.log("Feature collection has 1 or fewer items, navigation not possible");
      return;
    }

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentFeatureIndex + 1) % featureCollection.length;
    } else {
      newIndex = (currentFeatureIndex - 1 + featureCollection.length) % featureCollection.length;
    }

    console.log(`Navigating ${direction} to feature ${newIndex} of ${featureCollection.length}`);
    setCurrentFeatureIndex(newIndex);
    setSelectedFeature(featureCollection[newIndex]);
  };

  // Remove a layer from the map with improved debugging
  const removeLayer = (layer) => {
    console.log(`removeLayer called for layer: ${layer.id}`);

    if (!mapRef.current) {
      console.error("Map reference not available in removeLayer");
      return;
    }

    const map = mapRef.current;
    const sourceId = `source-${layer.id}`;
    const layerId = `layer-${layer.id}`;

    // Remove event listeners with proper error handling
    try {
      console.log(`Removing event listeners for layer ${layerId}`);
      map.off('click', layerId, handleFeatureClick);
      map.off('mouseenter', layerId);
      map.off('mouseleave', layerId);
    } catch (eventError) {
      console.error(`Error removing event listeners for layer ${layerId}:`, eventError);
    }

    // Remove layer and source with proper error handling
    try {
      if (map.getLayer(layerId)) {
        console.log(`Removing layer ${layerId}`);
        map.removeLayer(layerId);
      } else {
        console.log(`Layer ${layerId} not found, skipping removal`);
      }

      if (map.getSource(sourceId)) {
        console.log(`Removing source ${sourceId}`);
        map.removeSource(sourceId);
      } else {
        console.log(`Source ${sourceId} not found, skipping removal`);
      }
    } catch (removeError) {
      console.error(`Error removing layer/source ${layer.id}:`, removeError);
    }

    // Update state
    console.log(`Updating state after removing layer ${layer.id}`);
    setActiveLayers(prev => prev.filter(item => item.id !== layer.id));
    setLayerOrder(prev => prev.filter(id => id !== layer.id));

    // Reset selected feature if it came from this layer
    if (selectedLayer?.id === layer.id) {
      console.log("Resetting selected feature and layer");
      setSelectedFeature(null);
      setSelectedLayer(null);
      setSidebarMode('layers');
    }

    // Update legend
    updateLegend();
  };

  // Reorder layers with debugging
  const reorderLayers = (newOrder) => {
    console.log("reorderLayers called with new order:", newOrder);

    if (!mapRef.current) {
      console.error("Map reference not available in reorderLayers");
      return;
    }

    const map = mapRef.current;

    // Update z-index of layers
    newOrder.forEach((layerId, index) => {
      const mapLayerId = `layer-${layerId}`;
      if (map.getLayer(mapLayerId)) {
        console.log(`Updating z-index for layer ${mapLayerId} to ${index}`);
        // Check if the style is available and has layers collection
        if (map.style && map.style._layers) {
          const layer = map.style._layers[mapLayerId];
          if (layer) {
            layer.metadata = layer.metadata || {};
            layer.metadata.zIndex = index;
          }
        }
      } else {
        console.warn(`Layer ${mapLayerId} not found in map`);
      }
    });

    // Sort layers by z-index
    const layers = map.style && map.style._layers ?
      Object.values(map.style._layers).filter(layer =>
        layer.metadata && layer.metadata.zIndex !== undefined
      ) : [];

    console.log(`Sorting ${layers.length} layers by z-index`);
    layers.sort((a, b) => a.metadata.zIndex - b.metadata.zIndex);

    // Re-add layers in the correct order
    layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        console.log(`Re-adding layer ${layer.id} to maintain correct order`);
        map.removeLayer(layer.id);
        map.addLayer(layer);
      }
    });

    // Update state
    console.log("Updating layer order state");
    setLayerOrder(newOrder);
  };

  // Handle searching by coordinates with debugging
  const searchByCoordinates = async (latitude, longitude) => {
    console.log(`searchByCoordinates called with lat:${latitude}, lng:${longitude}`);

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      const errorMsg = 'Please enter valid coordinates';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log("Processing coordinate search");
      setIsLoading(true);
      setError(null);

      if (!token) {
        throw new Error("Authentication required for search. Please login.");
      }

      console.log(`Fetching features at location: ${latitude}, ${longitude}`);
      const results = await fetchFeaturesByLatLng(API_BASE_URL, latitude, longitude, token);
      console.log(`Search returned ${results.length} results`);

      setSearchResults(results);

      // Fly to location
      if (mapRef.current) {
        console.log(`Flying to coordinates: ${longitude}, ${latitude}`);
        mapRef.current.flyTo({
          center: [parseFloat(longitude), parseFloat(latitude)],
          zoom: 16,
          essential: true
        });

        // Add a marker at the search location
        if (markerRef.current) {
          markerRef.current.remove();
        }

        console.log("Adding marker at search location");
        markerRef.current = new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([parseFloat(longitude), parseFloat(latitude)])
          .addTo(mapRef.current);
      }
    } catch (err) {
      const errorMsg = `Search failed: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle searching by address/name with debugging
  const handleAddressSearch = async (query) => {
    console.log(`handleAddressSearch called with query: ${query}`);

    if (!query) {
      const errorMsg = 'Please enter a search term';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log("Processing address search");
      setIsLoading(true);
      setError(null);

      console.log(`Searching for address: ${query} using ${NOMINATIM_URL}`);
      const results = await searchByAddress(NOMINATIM_URL, query);
      console.log(`Address search returned ${results.length} results`);

      if (results.length === 0) {
        throw new Error('No results found');
      }

      setSearchResults(results.map(result => ({
        ...result,
        // Format for consistency with other search results
        name: result.display_name,
        coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
      })));

      // Fly to the first result
      const firstResult = results[0];
      if (mapRef.current && firstResult) {
        console.log(`Flying to first result: ${firstResult.display_name}`);
        mapRef.current.flyTo({
          center: [parseFloat(firstResult.lon), parseFloat(firstResult.lat)],
          zoom: 16,
          essential: true
        });

        // Add a marker at the search location
        if (markerRef.current) {
          markerRef.current.remove();
        }

        console.log("Adding marker at search location");
        markerRef.current = new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([parseFloat(firstResult.lon), parseFloat(firstResult.lat)])
          .addTo(mapRef.current);
      }
    } catch (err) {
      const errorMsg = `Search failed: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle report download with debugging
  const handleReportDownload = async (khataNo, district, taluka, village) => {
    console.log(`handleReportDownload called with khataNo:${khataNo}, district:${district}`);

    if (!khataNo || !district) {
      const errorMsg = 'Missing required information for report download';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log("Processing report download");
      setIsLoading(true);

      if (!token) {
        throw new Error("Authentication required for downloads. Please login.");
      }

      const params = new URLSearchParams({
        state: 'maharashtra',
        district: district.toLowerCase(),
        taluka: taluka ? taluka.toLowerCase() : '',
        village: village ? village.toLowerCase() : '',
        khata_no: khataNo
      });

      const url = `${API_BASE_URL}/report-gen/?${params}`;
      console.log(`Requesting report from: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report. Status: ${response.status}`);
      }

      console.log("Report generated successfully, downloading");

      // Convert response to blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Report_${khataNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log("Report download complete");

    } catch (err) {
      const errorMsg = `Download failed: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle sidebar expansion with debugging
  const toggleSidebar = (mode) => {
    console.log(`toggleSidebar called with mode: ${mode}, current mode: ${sidebarMode}, expanded: ${expandedSidebar}`);

    if (sidebarMode === mode && expandedSidebar) {
      console.log("Collapsing sidebar");
      setExpandedSidebar(false);
    } else {
      console.log(`Expanding sidebar with mode: ${mode}`);
      setSidebarMode(mode);
      setExpandedSidebar(true);
    }
  };

  // Extract taluka from layer ID
  const extractTalukaFromLayerId = (layerId) => {
    if (!layerId || !layerId.includes('_cadastrals')) return '';
    const taluka = layerId.split('_cadastrals')[0].split('.')[1] || '';
    console.log(`Extracted taluka "${taluka}" from layer ID: ${layerId}`);
    return taluka;
  };

  // Update layer filter with debugging
  const updateLayerFilter = (layerId, filterDef) => {
    console.log(`updateLayerFilter called for layer ${layerId}`, filterDef);

    setFilterDefinitions(prev => ({
      ...prev,
      [layerId]: filterDef
    }));

    // Reload the layer with the new filter
    const layer = activeLayers.find(l => l.id === layerId);
    if (layer) {
      console.log(`Reloading layer ${layerId} with new filter`);
      removeLayer(layer);
      loadLayer(layer);
    } else {
      console.warn(`Layer ${layerId} not found in active layers, cannot apply filter`);
    }
  };

  // Initialize measurement tool with debugging
  const initMeasurement = (type) => {
    console.log(`initMeasurement called with type: ${type}`);

    if (!mapRef.current) {
      console.error("Map reference not available in initMeasurement");
      return;
    }

    setMeasurementType(type);
    setMeasurementActive(true);
    setInfoModeActive(false);
    setHeatmapActive(false);

    // Clear previous measurements
    clearMeasurement();

    // Initialize measurement layer
    if (!measurementLayerRef.current) {
      console.log("Initializing measurement layer");
      const map = mapRef.current;

      try {
        if (!map.getSource('measurement-source')) {
          console.log("Adding measurement source");
          map.addSource('measurement-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });
        }

        if (!map.getLayer('measurement-line')) {
          console.log("Adding measurement line layer");
          map.addLayer({
            id: 'measurement-line',
            type: 'line',
            source: 'measurement-source',
            paint: {
              'line-color': '#ffff00',
              'line-width': 3,
              'line-opacity': 0.8
            }
          });
        }

        if (!map.getLayer('measurement-point')) {
          console.log("Adding measurement point layer");
          map.addLayer({
            id: 'measurement-point',
            type: 'circle',
            source: 'measurement-source',
            paint: {
              'circle-radius': 5,
              'circle-color': '#ff0000',
              'circle-opacity': 0.8
            },
            filter: ['==', '$type', 'Point']
          });
        }

        measurementLayerRef.current = {
          points: [],
          line: null
        };

        console.log("Measurement layers initialized successfully");
      } catch (err) {
        console.error("Error initializing measurement layers:", err);
        setError(`Failed to initialize measurement tool: ${err.message}`);
      }
    }
  };

  // Handle measurement click with debugging
  const handleMeasurementClick = (e) => {
    console.log(`handleMeasurementClick called with coordinates: ${e.lngLat.lng}, ${e.lngLat.lat}`);

    if (!measurementActive) {
      console.log("Measurement not active, ignoring click");
      return;
    }

    if (!mapRef.current) {
      console.error("Map reference not available in handleMeasurementClick");
      return;
    }

    const map = mapRef.current;
    const { lng, lat } = e.lngLat;

    try {
      // Make sure measurementLayerRef.current exists and has points property
      if (!measurementLayerRef.current) {
        console.log("Initializing measurement layer reference");
        measurementLayerRef.current = { points: [] };
      }

      // Add point to measurement
      measurementLayerRef.current.points.push([lng, lat]);
      console.log(`Added point [${lng}, ${lat}]. Total points: ${measurementLayerRef.current.points.length}`);

      // Update GeoJSON data
      const points = measurementLayerRef.current.points;
      const geojson = {
        type: 'FeatureCollection',
        features: [
          // Points
          ...points.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: point
            },
            properties: {}
          })),
          // Line
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: points
            },
            properties: {}
          }
        ]
      };

      // Update source data
      const source = map.getSource('measurement-source');
      if (source) {
        console.log("Updating measurement source data");
        source.setData(geojson);
      } else {
        console.error("Measurement source not found");
      }

      // Calculate measurement
      if (points.length > 1) {
        console.log(`Calculating ${measurementType} with ${points.length} points`);

        if (measurementType === 'distance') {
          // Calculate distance
          // Import turf functions if not available
          if (typeof turf === 'undefined') {
            console.error('Turf.js not available. Cannot calculate distance.');
            return;
          }

          let distance = 0;
          for (let i = 1; i < points.length; i++) {
            const from = turf.point(points[i - 1]);
            const to = turf.point(points[i]);
            distance += turf.distance(from, to, { units: 'kilometers' });
          }

          console.log(`Calculated distance: ${distance.toFixed(3)} km`);
          setMeasurementResult({
            type: 'distance',
            value: distance.toFixed(3),
            unit: 'km'
          });
        } else if (measurementType === 'area' && points.length > 2) {
          // Calculate area (polygon must be closed)
          // Import turf functions if not available
          if (typeof turf === 'undefined') {
            console.error('Turf.js not available. Cannot calculate area.');
            return;
          }

          const closedPoints = [...points, points[0]];
          const polygon = turf.polygon([closedPoints]);
          const area = turf.area(polygon) / 1000000; // Convert to sq km

          console.log(`Calculated area: ${area.toFixed(3)} km²`);
          setMeasurementResult({
            type: 'area',
            value: area.toFixed(3),
            unit: 'km²'
          });
        }
      }
    } catch (err) {
      console.error('Error handling measurement click:', err);
      setError(`Measurement failed: ${err.message}`);
    }
  };

  // Clear measurement with debugging
  const clearMeasurement = () => {
    console.log("clearMeasurement called");

    if (!mapRef.current) {
      console.error("Map reference not available in clearMeasurement");
      return;
    }

    const map = mapRef.current;

    // Reset measurement data
    if (measurementLayerRef.current) {
      console.log("Resetting measurement data");
      measurementLayerRef.current.points = [];

      // Update source data
      const source = map.getSource('measurement-source');
      if (source) {
        console.log("Clearing measurement source data");
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      } else {
        console.log("Measurement source not found, nothing to clear");
      }
    }

    setMeasurementResult(null);
  };

  // Generate heatmap with debugging
  const generateHeatmap = (layerId, property, colorScheme) => {
    console.log(`generateHeatmap called with layerId:${layerId}, property:${property}, colorScheme:${colorScheme}`);

    if (!mapRef.current) {
      console.error("Map reference not available in generateHeatmap");
      return;
    }

    if (!layerId || !property) {
      console.error("Missing required parameters for heatmap");
      return;
    }

    const map = mapRef.current;

    // Clear previous heatmap
    clearHeatmap();

    // Set heatmap state
    setHeatmapActive(true);
    setHeatmapLayer(layerId);
    setHeatmapProperty(property);
    setHeatmapColorScheme(colorScheme);

    // Turn off other tools
    setInfoModeActive(false);
    setMeasurementActive(false);

    // Create heatmap layer
    const sourceId = `heatmap-source-${layerId}`;
    const layerPrefix = `heatmap-${layerId}`;

    // Get the original layer's source
    const originalSourceId = `source-${layerId}`;
    const originalSource = map.getSource(originalSourceId);

    if (!originalSource) {
      const errorMsg = `Source not found for layer: ${layerId}`;
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log(`Creating heatmap for layer ${layerId} using property ${property}`);

      // Add heatmap source
      console.log(`Adding heatmap source ${sourceId}`);
      map.addSource(sourceId, {
        type: 'vector',
        tiles: originalSource._data ? [originalSource._data] : originalSource.tiles,
        minzoom: 0,
        maxzoom: 22
      });

      // Add heatmap layer
      console.log(`Adding heatmap layer ${layerPrefix}-heatmap`);
      map.addLayer({
        id: `${layerPrefix}-heatmap`,
        type: 'heatmap',
        source: sourceId,
        'source-layer': layerId,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', property],
            0, 0,
            100, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3
          ],
          'heatmap-color': getHeatmapColorRamp(colorScheme),
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            9, 20
          ],
          'heatmap-opacity': 0.8
        }
      });

      console.log("Heatmap created successfully");
    } catch (err) {
      console.error('Error generating heatmap:', err);
      setError(`Failed to generate heatmap: ${err.message}`);
    }
  };

  // Get heatmap color ramp based on color scheme
  const getHeatmapColorRamp = (scheme) => {
    const colorRamps = {
      YlOrRd: [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(255,255,204,0)',
        0.2, 'rgba(255,237,160,1)',
        0.4, 'rgba(254,217,118,1)',
        0.6, 'rgba(254,178,76,1)',
        0.8, 'rgba(253,141,60,1)',
        1, 'rgba(240,59,32,1)'
      ],
      BuRd: [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(178,24,43,0)',
        0.2, 'rgba(214,96,77,1)',
        0.4, 'rgba(244,165,130,1)',
        0.6, 'rgba(253,219,199,1)',
        0.8, 'rgba(209,229,240,1)',
        1, 'rgba(33,102,172,1)'
      ],
      GnRd: [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,104,55,0)',
        0.2, 'rgba(49,163,84,1)',
        0.4, 'rgba(120,198,121,1)',
        0.6, 'rgba(194,230,153,1)',
        0.8, 'rgba(255,255,178,1)',
        1, 'rgba(215,25,28,1)'
      ],
      WhBu: [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(255,255,255,0)',
        0.2, 'rgba(240,249,232,1)',
        0.4, 'rgba(186,228,188,1)',
        0.6, 'rgba(123,204,196,1)',
        0.8, 'rgba(67,162,202,1)',
        1, 'rgba(8,104,172,1)'
      ]
    };

    console.log(`Using color ramp: ${scheme}`);
    return colorRamps[scheme] || colorRamps.YlOrRd;
  };

  // Clear heatmap with debugging
  const clearHeatmap = () => {
    console.log("clearHeatmap called");

    if (!mapRef.current) {
      console.error("Map reference not available in clearHeatmap");
      return;
    }

    if (!heatmapLayer) {
      console.log("No active heatmap to clear");
      return;
    }

    const map = mapRef.current;
    const sourceId = `heatmap-source-${heatmapLayer}`;
    const layerId = `heatmap-${heatmapLayer}-heatmap`;

    // Remove layer and source
    try {
      if (map.getLayer(layerId)) {
        console.log(`Removing heatmap layer ${layerId}`);
        map.removeLayer(layerId);
      }

      if (map.getSource(sourceId)) {
        console.log(`Removing heatmap source ${sourceId}`);
        map.removeSource(sourceId);
      }
    } catch (err) {
      console.error("Error clearing heatmap:", err);
    }

    // Reset heatmap state
    console.log("Resetting heatmap state");
    setHeatmapActive(false);
    setHeatmapLayer(null);
    setHeatmapProperty('');
  };

  // Update legend
  const updateLegend = () => {
    console.log("updateLegend called");
    // Nothing to implement here since it's handled by the LegendPanel component
    // Just a placeholder to maintain consistency with the original pseudocode
  };

  // Generate and download map export with debugging
  const generateMapExport = async (options) => {
    console.log("generateMapExport called with options:", options);

    if (!mapRef.current) {
      console.error("Map reference not available in generateMapExport");
      return;
    }

    try {
      console.log("Processing map export");
      setIsLoading(true);

      const map = mapRef.current;

      // Generate a screenshot of the map
      const canvas = map.getCanvas();
      console.log("Generating map image from canvas");
      const mapImage = canvas.toDataURL('image/png');

      // Generate PDF report
      try {
        // Try to access jsPDF
        console.log("Attempting to access jsPDF");
        let jsPDF;
        if (window.jspdf) {
          jsPDF = window.jspdf.jsPDF;
          console.log("Using jsPDF from window.jspdf");
        } else {
          // Dynamic import as fallback
          console.log("Attempting dynamic import of jsPDF");
          const jspdfModule = await import('jspdf');
          jsPDF = jspdfModule.default;
          console.log("Using dynamically imported jsPDF");
        }

        console.log("Creating PDF document");
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        // Add title if requested
        if (options.includeTitle && options.title) {
          console.log(`Adding title: ${options.title}`);
          pdf.setFontSize(18);
          pdf.text(options.title, 20, 20);
          pdf.setFontSize(12);
        }

        // Add map image if requested
        if (options.includeMap) {
          console.log("Adding map image to PDF");
          pdf.addImage(mapImage, 'PNG', 20, options.includeTitle ? 30 : 20, 250, 150);
        }

        // Add attributes if requested
        if (options.includeAttributes && selectedFeature) {
          console.log("Adding feature attributes to PDF");
          const attributesY = options.includeMap ? (options.includeTitle ? 190 : 180) : (options.includeTitle ? 30 : 20);

          pdf.setFontSize(14);
          pdf.text('Feature Attributes', 20, attributesY);
          pdf.setFontSize(10);

          const attributes = Object.entries(selectedFeature)
            .filter(([key]) => !['geometry', 'bbox', 'id'].includes(key.toLowerCase()))
            .map(([key, value]) => `${key}: ${value !== null ? value : 'N/A'}`);

          attributes.forEach((attr, index) => {
            if (index < 40) { // Limit to prevent overflow
              pdf.text(attr, 20, attributesY + 10 + (index * 5));
            }
          });
        }

        // Save the PDF
        console.log("Saving PDF");
        pdf.save(options.title ? `${options.title}.pdf` : 'map_export.pdf');
        console.log("PDF saved successfully");
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        // Fallback - just download the map image if PDF generation fails
        console.log("Falling back to direct image download");
        const link = document.createElement('a');
        link.href = mapImage;
        link.download = options.title ? `${options.title}.png` : 'map_export.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      const errorMsg = `Export failed: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Zoom to layer extent with debugging
  const zoomToLayerExtent = async (layerId) => {
    console.log(`zoomToLayerExtent called for layer: ${layerId}`);

    if (!mapRef.current) {
      console.error("Map reference not available in zoomToLayerExtent");
      return;
    }

    if (!token) {
      console.error("Authentication token not available");
      setError("Authentication required to zoom to layer. Please login.");
      return;
    }

    try {
      console.log("Processing zoom to layer extent");
      setIsLoading(true);

      console.log(`Fetching extent for layer ${layerId}`);
      const extent = await fetchLayerExtent(API_BASE_URL, layerId, token);

      if (!extent) {
        throw new Error('Failed to fetch layer extent');
      }

      console.log(`Layer extent: [${extent.join(', ')}]`);

      // Convert extent to bounds
      const bounds = [
        [extent[0], extent[1]], // Southwest
        [extent[2], extent[3]]  // Northeast
      ];

      // Fit map to bounds
      console.log(`Fitting map to bounds: ${JSON.stringify(bounds)}`);
      mapRef.current.fitBounds(bounds, {
        padding: 20,
        maxZoom: 16
      });

    } catch (err) {
      const errorMsg = `Failed to zoom to layer: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to simulate layer loading for debugging
  const debugLoadSimpleLayer = () => {
    console.log("Loading a debug layer for testing");

    if (!mapRef.current) {
      console.error("Map not available");
      return;
    }

    const map = mapRef.current;

    try {
      // Add a simple GeoJSON source
      const sourceId = 'debug-source';
      const layerId = 'debug-layer';

      // Remove if exists
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Add debug source
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Debug Point', description: 'This is a test point' },
              geometry: {
                type: 'Point',
                coordinates: DEFAULT_CENTER
              }
            }
          ]
        }
      });

      // Add debug layer
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 10,
          'circle-color': '#ff0000',
          'circle-opacity': 0.8
        }
      });

      console.log("Debug layer added successfully");

      // Add click handler
      map.on('click', layerId, (e) => {
        console.log("Debug layer clicked:", e);
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<h3>${props.name}</h3><p>${props.description}</p>`)
            .addTo(map);
        }
      });

    } catch (err) {
      console.error("Error adding debug layer:", err);
    }
  };

  return (
    <div className="map-container">
      {/* Debug Tools - Enable for quick debugging */}
      <div className="debug-tools" style={{
        position: 'absolute',
        top: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '7px',
        borderRadius: '5px',
        display: 'flex',
        gap: '5px'
      }}>
        <button onClick={() => console.log("Map state:", {
          mapLoaded: mapRef.current ? true : false,
          token: token ? "Present" : "Missing",
          layersCount: layers.length,
          activeLayersCount: activeLayers.length
        })}>
          Debug Info
        </button>
        <button onClick={debugLoadSimpleLayer}>
          Load Test Layer
        </button>
        <button onClick={() => {
          localStorage.setItem('authToken', 'debug-token');
          console.log("Set debug token");
          setToken('debug-token');
        }}>
          Set Test Token
        </button>
      </div>

      {/* Login Popup */}
      {showLoginPopup && (
        <div className="auth-popup" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div className="auth-popup-content" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            <p>Please login to continue</p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && <LoadingIndicator />}

      {/* Error Message */}
      {error && (
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
      )}

      {/* API Unavailable Warning */}
      {!apiAvailable && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 165, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          maxWidth: '80%'
        }}>
          <p>API server is not responding. Map functionality will be limited.</p>
        </div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${expandedSidebar ? 'expanded' : ''}`}>
        {/* Sidebar Controls */}
        <div className="sidebar-controls">
          <button
            className={`sidebar-control ${layerPopupOpen ? 'active' : ''}`}
            onClick={() => setLayerPopupOpen(true)}
            title="Layers"
          >
            <span role="img" aria-label="layers">🗂️</span>
            <span className="control-label">Layers</span>
          </button>


          <button
            className={`sidebar-control ${sidebarMode === 'search' ? 'active' : ''}`}
            onClick={() => toggleSidebar('search')}
            title="Search"
          >
            <span role="img" aria-label="search">🔍</span>
            <span className="control-label">Search</span>
          </button>

          <button
            className={`sidebar-control ${infoModeActive ? 'active' : ''}`}
            onClick={toggleInfoMode}
            title="Feature Info"
          >
            <span role="img" aria-label="info">ℹ️</span>
            <span className="control-label">Info</span>
          </button>

          <button
            className={`sidebar-control ${sidebarMode === 'filter' ? 'active' : ''}`}
            onClick={() => toggleSidebar('filter')}
            title="Filter"
          >
            <span role="img" aria-label="filter">🔍</span>
            <span className="control-label">Filter</span>
          </button>

          <button
            className={`sidebar-control ${sidebarMode === 'measurement' ? 'active' : ''}`}
            onClick={() => toggleSidebar('measurement')}
            title="Measurement"
          >
            <span role="img" aria-label="measurement">📏</span>
            <span className="control-label">Measure</span>
          </button>

          <button
            className={`sidebar-control ${sidebarMode === 'heatmap' ? 'active' : ''}`}
            onClick={() => toggleSidebar('heatmap')}
            title="Heatmap"
          >
            <span role="img" aria-label="heatmap">🔥</span>
            <span className="control-label">Heatmap</span>
          </button>

          <button
            className={`sidebar-control ${sidebarMode === 'export' ? 'active' : ''}`}
            onClick={() => toggleSidebar('export')}
            title="Export"
          >
            <span role="img" aria-label="export">📤</span>
            <span className="control-label">Export</span>
          </button>

          <button
            className="sidebar-control"
            onClick={() => router.push('/dashboard')}
            title="Dashboard"
          >
            <span role="img" aria-label="dashboard">🏠</span>
            <span className="control-label">Dashboard</span>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="sidebar-content">
          {/* Map Style Control */}
          <MapStyleControl
            currentStyle={mapStyle}
            onStyleChange={setMapStyle}
          />

          {/* Layers Panel */}
          {/* {sidebarMode === 'layers' && (
            <LayerControl
              districts={districts}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              layers={layers}
              activeLayers={activeLayers}
              layerOrder={layerOrder}
              onLayerAdd={(layer) => {
                console.log("LayerControl: onLayerAdd triggered for layer:", layer);
                loadLayer(layer);
              }}
              onLayerRemove={removeLayer}
              onLayerOrderChange={reorderLayers}
              onZoomToLayer={zoomToLayerExtent}
            />
          )} */}

          {layerPopupOpen && (
            <div className="layer-popup">
              <div className="popup-content">
                <button className="close-btn" onClick={() => setLayerPopupOpen(false)}>✖</button>
                <LayerControl
                  districts={districts}
                  selectedDistrict={selectedDistrict}
                  onDistrictChange={setSelectedDistrict}
                  layers={layers}
                  activeLayers={activeLayers}
                  layerOrder={layerOrder}
                  onLayerAdd={(layer) => {
                    console.log("LayerControl: onLayerAdd triggered for layer:", layer);
                    loadLayer(layer);
                    setLayerPopupOpen(false); // Close popup after selection
                  }}
                  onLayerRemove={removeLayer}
                  onLayerOrderChange={reorderLayers}
                  onZoomToLayer={zoomToLayerExtent}
                />
              </div>
            </div>
          )}


          {/* Search Panel */}
          {sidebarMode === 'search' && (
            <SearchPanel
              searchCoords={searchCoords}
              onCoordsChange={setSearchCoords}
              onSearch={() => searchByCoordinates(searchCoords.latitude, searchCoords.longitude)}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onAddressSearch={handleAddressSearch}
              searchResults={searchResults}
              onDownloadReport={handleReportDownload}
            />
          )}

          {/* Feature Panel */}
          {sidebarMode === 'feature' && selectedFeature && (
            <FeaturePanel
              feature={selectedFeature}
              khataNos={khataNos}
              district={selectedDistrict}
              taluka={selectedLayer ? extractTalukaFromLayerId(selectedLayer.id) : ''}
              hasMultipleFeatures={featureCollection.length > 1}
              onPrevFeature={() => navigateFeatures('prev')}
              onNextFeature={() => navigateFeatures('next')}
              onClose={() => {
                setSelectedFeature(null);
                setSidebarMode('layers');
              }}
              onDownloadReport={handleReportDownload}
              onExport={() => {
                setSidebarMode('export');
                setExportOptions(prev => ({
                  ...prev,
                  includeAttributes: true
                }));
              }}
            />
          )}

          {/* Filter Panel */}
          {sidebarMode === 'filter' && (
            <FilterPanel
              activeLayers={activeLayers}
              selectedLayer={filterActiveLayer}
              onSelectLayer={setFilterActiveLayer}
              filterDefinitions={filterDefinitions}
              onUpdateFilter={updateLayerFilter}
              metadata={metadataCache.current}
            />
          )}

          {/* Measurement Tools */}
          {sidebarMode === 'measurement' && (
            <MeasurementTools
              active={measurementActive}
              type={measurementType}
              result={measurementResult}
              onMeasurementStart={initMeasurement}
              onMeasurementClear={clearMeasurement}
            />
          )}

          {/* Heatmap Control */}
          {sidebarMode === 'heatmap' && (
            <HeatmapControl
              activeLayers={activeLayers}
              selectedLayer={heatmapLayer}
              selectedProperty={heatmapProperty}
              colorScheme={heatmapColorScheme}
              metadata={metadataCache.current}
              onGenerateHeatmap={generateHeatmap}
              onClearHeatmap={clearHeatmap}
            />
          )}

          {/* Export Tools */}
          {sidebarMode === 'export' && (
            <ExportTools
              options={exportOptions}
              onOptionsChange={setExportOptions}
              onExport={generateMapExport}
              hasFeature={!!selectedFeature}
            />
          )}

          {/* Legend Panel - Always visible when sidebar is open */}
          {expandedSidebar && activeLayers.length > 0 && (
            <LegendPanel
              activeLayers={activeLayers}
              metadata={metadataCache.current}
            />
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="map-wrapper">
        <div ref={mapContainerRef} className="map-element" />

        {/* Measurement Result Overlay */}
        {measurementActive && measurementResult && (
          <div className="measurement-result">
            <strong>{measurementResult.type === 'distance' ? 'Distance' : 'Area'}:</strong>
            {measurementResult.value} {measurementResult.unit}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
const TILE_ENDPOINT_URL = process.env.NEXT_PUBLIC_TILE_ENDPOINT_URL || 'http://43.204.226.30:8088';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_CENTER = [75.7139, 21.0486];
const DEFAULT_ZOOM = 12;

// Map style definitions
const MAP_STYLES = {
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

// Error Message Component
const ErrorMessage = ({ error, onDismiss }) => (
  <div className="error-message">
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
  const [sidebarMode, setSidebarMode] = useState('layers');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [layerPopupOpen, setLayerPopupOpen] = useState(false);

  // Feature Info State
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [khataNos, setKhataNos] = useState([]);
  const [featureCollection, setFeatureCollection] = useState([]);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [infoModeActive, setInfoModeActive] = useState(false);

  // Search State
  const [searchCoords, setSearchCoords] = useState({ latitude: '', longitude: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Filter State
  const [filterDefinitions, setFilterDefinitions] = useState({});
  const [filterActiveLayer, setFilterActiveLayer] = useState(null);

  // Measurement State
  const [measurementActive, setMeasurementActive] = useState(false);
  const [measurementType, setMeasurementType] = useState('distance');
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
  useEffect(() => {
    const checkApi = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/health-check`, {
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        setApiAvailable(response.ok);
        if (!response.ok) {
          setError("API server is not responding. Map functionality will be limited.");
        }
      } catch (error) {
        setApiAvailable(false);
        setError("Unable to connect to the API server. Map functionality will be limited.");
      }
    };

    checkApi();
  }, []);

  // Initialize token from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        setToken(storedToken);
      } else {
        setError("Authentication required. Please login.");
        handleUnauthorizedAccess();
      }
    } catch (err) {
      setError("Failed to access authentication storage. Please ensure cookies are enabled.");
    }
  }, []);

  // Define clearMeasurement at the top, before any function that might reference it
  const clearMeasurement = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Reset measurement data
    if (measurementLayerRef.current) {
      measurementLayerRef.current.points = [];

      // Update source data
      const source = map.getSource('measurement-source');
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }

    setMeasurementResult(null);
  }, []);

  // Handle unauthorized access
  const handleUnauthorizedAccess = useCallback(() => {
    setShowLoginPopup(true);
    const redirectTimer = setTimeout(() => {
      setShowLoginPopup(false);
      router.push('/signin');
    }, 2000);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  // Fetch layers and districts when component mounts and token is available
  useEffect(() => {
    if (!token || !apiAvailable) return;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to validate token first to catch authentication issues early
        try {
          await fetch(`${API_BASE_URL}/user/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
        } catch (authError) {
          // If token validation fails, redirect to login
          console.error("Authentication failed:", authError);
          handleUnauthorizedAccess();
          return;
        }

        // Fetch layers and districts in parallel with better error handling
        const [layersData, districtsData] = await Promise.all([
          fetchLayers(TILE_SERVER_URL).catch(err => {
            console.error("Error fetching layers:", err);
            return [];
          }),
          fetchDistricts(API_BASE_URL, token).catch(err => {
            console.error("Error fetching districts:", err);
            return [];
          })
        ]);

        // Update state with fetched data
        if (layersData.length > 0) {
          setLayers(layersData);
        }

        if (districtsData.length > 0) {
          setDistricts(districtsData);
        }

        // Set error if both fetches failed
        if (layersData.length === 0 && districtsData.length === 0) {
          throw new Error("Failed to load initial map data");
        }
      } catch (err) {
        setError(`Failed to load initial data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [token, apiAvailable, handleUnauthorizedAccess]);

  // Initialize or update map when mapStyle changes
  useEffect(() => {
    if (!mapContainerRef.current) return;

    console.log("[MAP INIT] Starting map initialization with style:", mapStyle);

    // Function to initialize map
    const initializeMap = () => {
      try {
        // If map already exists, update style instead of recreating
        if (mapRef.current) {
          try {
            // Just update the style instead of removing and recreating
            console.log("[MAP INIT] Updating existing map style to:", mapStyle);
            mapRef.current.setStyle(MAP_STYLES[mapStyle]);
            return;
          } catch (e) {
            console.error("[MAP INIT] Error updating map style:", e);
            // If updating fails, proceed to recreate the map
            mapRef.current.remove();
          }
        }

        console.log("[MAP INIT] Creating new map with style:", mapStyle);
        // Create new map
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLES[mapStyle],
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          minZoom: 6,
          attributionControl: true
        });

        // Add controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
        map.addControl(new maplibregl.FullscreenControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true
        }), 'top-right');

        // Create a popup instance if it doesn't exist
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px'
          });
        }

        // Set map reference
        mapRef.current = map;

        // Add event listeners
        map.on('load', () => {
          console.log("[MAP INIT] Map loaded successfully");
          // Reload active layers when map is ready
          if (activeLayers.length > 0) {
            console.log("[MAP INIT] Re-adding active layers:", activeLayers.length);
            activeLayers.forEach(layer => loadLayer(layer));
          }
        });

        map.on('click', (e) => {
          console.log("[MAP CLICK]", e);
          console.log("[INFO MODE]", infoModeActive);
          if (infoModeActive) {
            console.log("[INFO MODE] Handling feature info request");
            handleFeatureInfoRequest(e);
          }

          if (measurementActive) {
            console.log("[MEASUREMENT] Processing click event");
            handleMeasurementClick(e);
          }
        });

        map.on('error', (e) => {
          console.error("[MAP ERROR]", e.error?.message || 'Unknown error');
          setError(`Map error: ${e.error?.message || 'Unknown error'}`);
        });
      } catch (err) {
        console.error("[MAP INIT] Failed to initialize map:", err.message);
        setError(`Failed to initialize map: ${err.message}`);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (mapRef.current) {
        console.log("[MAP CLEANUP] Removing map instance");
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapStyle]);

  // Load a layer onto the map
  const loadLayer = useCallback(async (layer) => {
    console.log("[LAYER] Loading layer:", layer.id);

    if (!mapRef.current || !token) {
      console.log("[LAYER] Cannot load layer - map or token missing");
      if (!token) handleUnauthorizedAccess();
      return;
    }

    const map = mapRef.current;

    // Check if map is loaded
    if (!map.loaded()) {
      console.log("[LAYER] Map not fully loaded, waiting for load event");
      map.once('load', () => loadLayer(layer));
      return;
    }

    // Skip if layer is already loaded
    if (activeLayers.find(activeLayer => activeLayer.id === layer.id)) {
      console.log("[LAYER] Layer already loaded, setting as selected:", layer.id);
      setSelectedLayer(layer);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("[LAYER] Fetching tile URL for layer:", layer.id);

      // Fetch tile URL with authentication token
      const tileUrl = await fetchTileUrl(API_BASE_URL, layer.id, token);
      console.log("[LAYER] Received tile URL:", tileUrl ? "Success" : "Failed");

      // Fetch layer metadata if not already cached
      if (!metadataCache.current[layer.id]) {
        console.log("[LAYER] Fetching metadata for layer:", layer.id);
        const metadata = await fetchMetadata(TILE_SERVER_URL, layer.id);
        metadataCache.current[layer.id] = metadata;
        console.log("[LAYER] Metadata received:", metadata ? "Success" : "Failed");
      }

      const metadata = metadataCache.current[layer.id];
      const geometryType = metadata?.geometrytype;
      console.log("[LAYER] Layer geometry type:", geometryType);

      if (!geometryType) {
        throw new Error(`Geometry type not found for layer: ${layer.name || layer.id}`);
      }

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
          throw new Error(`Unsupported geometry type: ${geometryType}`);
      }

      // Add source and layer to map
      const sourceId = `source-${layer.id}`;
      const layerId = `layer-${layer.id}`;

      // Check if source already exists, remove it if it does
      if (map.getSource(sourceId)) {
        console.log("[LAYER] Source already exists, removing:", sourceId);
        map.removeLayer(layerId);
        map.removeSource(sourceId);
      }

      // Apply filter if exists for this layer
      let filter = null;
      if (filterDefinitions[layer.id]) {
        console.log("[LAYER] Applying filter to layer:", layer.id);
        filter = createCQLFilter(filterDefinitions[layer.id]);
      }

      // Format the tile URL properly using the tile endpoint and Openresty proxy format
      // Extract the token part from the response
      const tokenParam = tileUrl.includes('token=') ? tileUrl.split('token=')[1] : '';
      console.log("[LAYER] Token param extracted:", tokenParam ? "Success" : "Failed");

      // Format for OpenResty proxy container at port 8088
      const finalTileUrl = filter
        ? `${TILE_ENDPOINT_URL}/${layer.id}/{z}/{x}/{y}.pbf?token=${tokenParam}&cql_filter=${encodeURIComponent(filter)}`
        : `${TILE_ENDPOINT_URL}/${layer.id}/{z}/{x}/{y}.pbf?token=${tokenParam}`;

      console.log("[LAYER] Final tile URL pattern created:", finalTileUrl ? "Success" : "Failed");

      // Add source with error handling
      try {
        console.log("[LAYER] Adding source to map:", sourceId);
        map.addSource(sourceId, {
          type: 'vector',
          tiles: [finalTileUrl],
          minzoom: 0,
          maxzoom: 22
        });
        console.log("[LAYER] Source added successfully:", sourceId);
      } catch (sourceError) {
        // If adding the source fails, try with alternative URL format
        console.warn("[LAYER] Failed to add source with primary URL format, trying alternative:", sourceError.message);

        try {
          // Try alternative format with dot notation instead of slash
          const alternativeLayerId = formattedLayerId.replace(/\//g, '.');
          const alternativeUrl = `${TILE_ENDPOINT_URL}/${alternativeLayerId}/{z}/{x}/{y}.pbf?token=${tokenParam}`;
          console.log("[LAYER] Trying alternative URL format:", alternativeUrl ? "Created" : "Failed");

          map.addSource(sourceId, {
            type: 'vector',
            tiles: [alternativeUrl],
            minzoom: 0,
            maxzoom: 22
          });
          console.log("[LAYER] Alternative source added successfully");
        } catch (altError) {
          console.error("[LAYER] Both source formats failed:", altError.message);
          throw new Error(`Failed to add source with either URL format: ${altError.message}`);
        }
      }

      // Add layer
      console.log("[LAYER] Adding layer to map:", layerId, "type:", layerType);
      map.addLayer({
        id: layerId,
        type: layerType,
        source: sourceId,
        'source-layer': layer.id,
        paint: paint
      });
      console.log("[LAYER] Layer added successfully:", layerId);

      // Add click event handler
      console.log("[LAYER] Adding click handler to layer:", layerId);
      map.on('click', layerId, handleFeatureClick);

      // Add hover effect
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Update state
      console.log("[LAYER] Updating state with new active layer:", layer.id);
      setActiveLayers(prev => [...prev, layer]);
      setLayerOrder(prev => [...prev, layer.id]);
      setSelectedLayer(layer);
      console.log("[LAYER] Layer loading complete:", layer.id);

    } catch (err) {
      console.error("[LAYER] Failed to load layer:", layer.id, "Error:", err.message);
      setError(`Failed to load layer ${layer.id || 'unknown'}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeLayers, filterDefinitions, handleUnauthorizedAccess]);

  // Handle clicking on a feature
  const handleFeatureClick = useCallback((e) => {
    console.log("[FEATURE CLICK] Event received", e);

    if (!mapRef.current || !infoModeActive) {
      console.log("[FEATURE CLICK] Skipping - map ref missing or info mode inactive");
      return;
    }

    const feature = e.features && e.features[0];
    if (!feature) {
      console.log("[FEATURE CLICK] No feature found in click event");
      return;
    }

    console.log("[FEATURE CLICK] Feature found:", feature.id);

    // Extract khata numbers if available
    const properties = feature.properties;
    console.log("[FEATURE CLICK] Feature properties:", properties);

    const khataNo = properties.khata_no;
    console.log("[FEATURE CLICK] Khata number:", khataNo);

    let parsedKhataNos = [];
    if (khataNo) {
      parsedKhataNos = khataNo.split(',').map(k => k.trim());
      console.log("[FEATURE CLICK] Parsed khata numbers:", parsedKhataNos);
    }

    // Update state
    console.log("[FEATURE CLICK] Setting selected feature and updating UI");
    setSelectedFeature(properties);
    setKhataNos(parsedKhataNos);
    setSidebarMode('feature');
    setExpandedSidebar(true);

    // Fly to feature
    const coordinates = e.lngLat;
    console.log("[FEATURE CLICK] Flying to coordinates:", coordinates);
    mapRef.current.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      essential: true
    });
  }, [infoModeActive]);

  // Load feature info for all layers at a point
  const handleFeatureInfoRequest = useCallback(async (e) => {
    console.log("[INFO MODE] Handling feature info request");
    if (!mapRef.current || !token || activeLayers.length === 0) {
      console.log("[INFO MODE] Skipping feature info request");
      if (!token) handleUnauthorizedAccess();
      return;
    }

    try {
      setIsLoading(true);

      const map = mapRef.current;
      const point = e.lngLat;

      // Fetch features for all active layers
      const fetchPromises = activeLayers.map(async (layer) => {
        try {
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
      });

      // Wait for all fetch operations to complete
      const results = await Promise.all(fetchPromises);

      // Flatten results
      const allFeatures = results.flat();

      if (allFeatures.length > 0) {
        setFeatureCollection(allFeatures);
        setCurrentFeatureIndex(0);
        setSelectedFeature(allFeatures[0]);
        setSidebarMode('feature');
        setExpandedSidebar(true);
      } else {
        popupRef.current
          .setLngLat(point)
          .setHTML("<p>No features found at this location</p>")
          .addTo(map);
      }
    } catch (err) {
      setError(`Feature info request failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeLayers, token, handleUnauthorizedAccess]);

  // Toggle info mode
  const toggleInfoMode = useCallback(() => {
    const newState = !infoModeActive;
    console.log("[INFO MODE]", newState);
    setInfoModeActive(newState);
    // Update cursor
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = newState ? 'help' : '';
      console.log(`[INFO MODE] Cursor updated to: ${newState ? 'help' : 'default'}`);
    } else {
      console.warn('[INFO MODE] mapRef.current is null when toggling info mode');
    }
    // Turn off other tools
    if (!infoModeActive) {
      console.log("[INFO MODE] Turning off other tools");
      setMeasurementActive(false);
      setHeatmapActive(false);
    }
  }, [infoModeActive]);

  // Navigate between features in feature collection
  const navigateFeatures = useCallback((direction) => {
    if (featureCollection.length <= 1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentFeatureIndex + 1) % featureCollection.length;
    } else {
      newIndex = (currentFeatureIndex - 1 + featureCollection.length) % featureCollection.length;
    }

    setCurrentFeatureIndex(newIndex);
    setSelectedFeature(featureCollection[newIndex]);
  }, [featureCollection, currentFeatureIndex]);

  // Remove a layer from the map
  const removeLayer = useCallback((layer) => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const sourceId = `source-${layer.id}`;
    const layerId = `layer-${layer.id}`;

    // Remove event listeners
    try {
      map.off('click', layerId, handleFeatureClick);
      map.off('mouseenter', layerId);
      map.off('mouseleave', layerId);
    } catch (err) {
      // Ignore errors from removing event listeners
    }

    // Remove layer and source
    try {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    } catch (err) {
      console.error(`Error removing layer/source ${layer.id}:`, err);
    }

    // Update state
    setActiveLayers(prev => prev.filter(item => item.id !== layer.id));
    setLayerOrder(prev => prev.filter(id => id !== layer.id));

    // Reset selected feature if it came from this layer
    if (selectedLayer?.id === layer.id) {
      setSelectedFeature(null);
      setSelectedLayer(null);
      setSidebarMode('layers');
    }
  }, [handleFeatureClick, selectedLayer]);

  // Reorder layers
  const reorderLayers = useCallback((newOrder) => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Update z-index of layers
    newOrder.forEach((layerId, index) => {
      const mapLayerId = `layer-${layerId}`;
      if (map.getLayer(mapLayerId)) {
        // Check if the style is available and has layers collection
        if (map.style && map.style._layers) {
          const layer = map.style._layers[mapLayerId];
          if (layer) {
            layer.metadata = layer.metadata || {};
            layer.metadata.zIndex = index;
          }
        }
      }
    });

    // Sort layers by z-index
    const layers = map.style && map.style._layers
      ? Object.values(map.style._layers).filter(layer =>
        layer.metadata && layer.metadata.zIndex !== undefined
      ) : [];

    layers.sort((a, b) => a.metadata.zIndex - b.metadata.zIndex);

    // Re-add layers in the correct order
    layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        map.removeLayer(layer.id);
        map.addLayer(layer);
      }
    });

    // Update state
    setLayerOrder(newOrder);
  }, []);

  // Handle searching by coordinates
  const searchByCoordinates = useCallback(async (latitude, longitude) => {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setError('Please enter valid coordinates');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!token) {
        handleUnauthorizedAccess();
        return;
      }

      const results = await fetchFeaturesByLatLng(API_BASE_URL, latitude, longitude, token);
      setSearchResults(results);

      // Fly to location
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [parseFloat(longitude), parseFloat(latitude)],
          zoom: 10,
          essential: true
        });

        // Add a marker at the search location
        if (markerRef.current) {
          markerRef.current.remove();
        }

        markerRef.current = new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([parseFloat(longitude), parseFloat(latitude)])
          .addTo(mapRef.current);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [token, handleUnauthorizedAccess]);

  // Handle searching by address/name
  const handleAddressSearch = useCallback(async (query) => {
    if (!query) {
      setError('Please enter a search term');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await searchByAddress(NOMINATIM_URL, query);

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
        mapRef.current.flyTo({
          center: [parseFloat(firstResult.lon), parseFloat(firstResult.lat)],
          zoom: 16,
          essential: true
        });

        // Add a marker at the search location
        if (markerRef.current) {
          markerRef.current.remove();
        }

        markerRef.current = new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([parseFloat(firstResult.lon), parseFloat(firstResult.lat)])
          .addTo(mapRef.current);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle report download
  const handleReportDownload = useCallback(async (khataNo, district, taluka, village) => {
    console.log("[REPORT] Starting report download request with params:", {
      khataNo, district, taluka, village
    });

    if (!khataNo || !district) {
      console.error("[REPORT] Missing required parameters for report download");
      setError('Missing required information for report download');
      return;
    }

    try {
      setIsLoading(true);

      if (!token) {
        console.error("[REPORT] No auth token available");
        handleUnauthorizedAccess();
        return;
      }

      const params = new URLSearchParams({
        state: 'maharashtra',
        district: district.toLowerCase(),
        taluka: taluka ? taluka.toLowerCase() : '',
        village: village ? village.toLowerCase() : '',
        khata_no: khataNo
      });

      const url = `${API_BASE_URL}/report-gen/?${params}`;
      console.log("[REPORT] Sending API request to:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log("[REPORT] Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to generate report. Status: ${response.status}`);
      }

      console.log("[REPORT] Report generation successful, processing download");

      // Convert response to blob and download
      const blob = await response.blob();
      console.log("[REPORT] Blob received, size:", blob.size);

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Report_${khataNo}.pdf`;
      document.body.appendChild(link);

      console.log("[REPORT] Triggering download");
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      console.log("[REPORT] Download complete");
    } catch (err) {
      console.error("[REPORT] Download failed:", err.message);
      setError(`Download failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [token, handleUnauthorizedAccess]);

  // Toggle sidebar expansion
  const toggleSidebar = useCallback((mode) => {
    if (sidebarMode === mode && expandedSidebar) {
      setExpandedSidebar(false);
    } else {
      setSidebarMode(mode);
      setExpandedSidebar(true);
    }
  }, [sidebarMode, expandedSidebar]);

  // Extract taluka from layer ID
  const extractTalukaFromLayerId = useCallback((layerId) => {
    if (!layerId || !layerId.includes('_cadastrals')) return '';
    const taluka = layerId.split('_cadastrals')[0].split('.')[1] || '';
    return taluka;
  }, []);

  // Update layer filter
  const updateLayerFilter = useCallback((layerId, filterDef) => {
    setFilterDefinitions(prev => ({
      ...prev,
      [layerId]: filterDef
    }));

    // Reload the layer with the new filter
    const layer = activeLayers.find(l => l.id === layerId);
    if (layer) {
      removeLayer(layer);
      loadLayer(layer);
    }
  }, [activeLayers, loadLayer, removeLayer]);



  // Initialize measurement tool
  const initMeasurement = useCallback((type) => {
    console.log("[MEASUREMENT] Initializing measurement tool with type:", type);
    console.log("[MEASUREMENT] Current map ref:", mapRef.current);
    if (!mapRef.current) return;

    console.log("[MEASUREMENT] Setting measurement type and activating tool. State - active: ${measurementActive}, type: ${type}");
    setMeasurementType(type);
    setMeasurementActive(true);
    setInfoModeActive(false);
    setHeatmapActive(false);


    if (mapRef.current && mapRef.current.getCanvas()) {
      mapRef.current.getCanvas().style.cursor = 'crosshair';
    }

    // Clear previous measurements
    console.log("[MEASUREMENT] Clearing previous measurements");
    clearMeasurement();

    // Initialize measurement layer
    if (!measurementLayerRef.current) {
      const map = mapRef.current;

      try {
        if (!map.getSource('measurement-source')) {
          map.addSource('measurement-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });
        }

        if (!map.getLayer('measurement-line')) {
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
      } catch (err) {
        setError(`Failed to initialize measurement tool: ${err.message}`);
      }
    }
  }, [clearMeasurement]);

  // Handle measurement click
  const handleMeasurementClick = useCallback((e) => {
    if (!measurementActive || !mapRef.current) return;

    const map = mapRef.current;
    const { lng, lat } = e.lngLat;

    try {
      // Make sure measurementLayerRef.current exists and has points property
      if (!measurementLayerRef.current) {
        measurementLayerRef.current = { points: [] };
      }

      // Add point to measurement
      measurementLayerRef.current.points.push([lng, lat]);

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
        source.setData(geojson);
      }

      // Calculate measurement
      if (points.length > 1) {
        if (measurementType === 'distance') {
          // Calculate distance
          let distance = 0;
          for (let i = 1; i < points.length; i++) {
            const from = turf.point(points[i - 1]);
            const to = turf.point(points[i]);
            distance += turf.distance(from, to, { units: 'kilometers' });
          }

          setMeasurementResult({
            type: 'distance',
            value: distance.toFixed(3),
            unit: 'km'
          });
        } else if (measurementType === 'area' && points.length > 2) {
          // Calculate area (polygon must be closed)
          const closedPoints = [...points, points[0]];
          const polygon = turf.polygon([closedPoints]);
          const area = turf.area(polygon) / 1000000; // Convert to sq km

          setMeasurementResult({
            type: 'area',
            value: area.toFixed(3),
            unit: 'km²'
          });
        }
      }
    } catch (err) {
      setError(`Measurement failed: ${err.message}`);
    }
  }, [measurementActive, measurementType]);

  // Generate heatmap
  const generateHeatmap = useCallback((layerId, property, colorScheme) => {
    if (!mapRef.current || !layerId || !property) return;

    const map = mapRef.current;

    // Clear previous heatmap
    if (heatmapLayer) {
      const oldSourceId = `heatmap-source-${heatmapLayer}`;
      const oldLayerId = `heatmap-${heatmapLayer}-heatmap`;

      try {
        if (map.getLayer(oldLayerId)) {
          map.removeLayer(oldLayerId);
        }

        if (map.getSource(oldSourceId)) {
          map.removeSource(oldSourceId);
        }
      } catch (err) {
        console.error("Error clearing previous heatmap:", err);
      }
    }

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
      setError(`Source not found for layer: ${layerId}`);
      return;
    }

    try {
      // Add heatmap source
      map.addSource(sourceId, {
        type: 'vector',
        tiles: originalSource._data ? [originalSource._data] : originalSource.tiles,
        minzoom: 0,
        maxzoom: 22
      });

      // Add heatmap layer
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
    } catch (err) {
      setError(`Failed to generate heatmap: ${err.message}`);
    }
  }, [heatmapLayer]);

  // Get heatmap color ramp based on color scheme
  const getHeatmapColorRamp = useCallback((scheme) => {
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

    return colorRamps[scheme] || colorRamps.YlOrRd;
  }, []);

  // Clear heatmap
  const clearHeatmap = useCallback(() => {
    if (!mapRef.current || !heatmapLayer) return;

    const map = mapRef.current;
    const sourceId = `heatmap-source-${heatmapLayer}`;
    const layerId = `heatmap-${heatmapLayer}-heatmap`;

    // Remove layer and source
    try {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    } catch (err) {
      console.error("Error clearing heatmap:", err);
    }

    // Reset heatmap state
    setHeatmapActive(false);
    setHeatmapLayer(null);
    setHeatmapProperty('');
  }, [heatmapLayer]);

  // Generate and download map export
  const generateMapExport = useCallback(async (options) => {
    console.log("[EXPORT] Starting map export with options:", options);

    if (!mapRef.current) {
      console.error("[EXPORT] Map reference not available");
      return;
    }

    try {
      setIsLoading(true);

      const map = mapRef.current;

      // Generate a screenshot of the map
      console.log("[EXPORT] Generating map screenshot");
      const canvas = map.getCanvas();
      const mapImage = canvas.toDataURL('image/png');
      console.log("[EXPORT] Screenshot generated");

      // Generate PDF report
      try {
        // Dynamic import jsPDF
        console.log("[EXPORT] Importing jsPDF");
        const jspdfModule = await import('jspdf');
        const jsPDF = jspdfModule.default;
        console.log("[EXPORT] jsPDF imported successfully");

        const pdf = new jsPDF('landscape', 'mm', 'a4');
        console.log("[EXPORT] PDF document created");

        // Add title if requested
        if (options.includeTitle && options.title) {
          console.log("[EXPORT] Adding title:", options.title);
          pdf.setFontSize(18);
          pdf.text(options.title, 20, 20);
          pdf.setFontSize(12);
        }

        // Add map image if requested
        if (options.includeMap) {
          console.log("[EXPORT] Adding map image to PDF");
          pdf.addImage(mapImage, 'PNG', 20, options.includeTitle ? 30 : 20, 250, 150);
        }

        // Add attributes if requested
        if (options.includeAttributes && selectedFeature) {
          console.log("[EXPORT] Adding feature attributes to PDF");
          const attributesY = options.includeMap ? (options.includeTitle ? 190 : 180) : (options.includeTitle ? 30 : 20);

          pdf.setFontSize(14);
          pdf.text('Feature Attributes', 20, attributesY);
          pdf.setFontSize(10);

          const attributes = Object.entries(selectedFeature)
            .filter(([key]) => !['geometry', 'bbox', 'id'].includes(key.toLowerCase()))
            .map(([key, value]) => `${key}: ${value !== null ? value : 'N/A'}`);

          console.log("[EXPORT] Adding", attributes.length, "attributes to PDF");
          attributes.forEach((attr, index) => {
            if (index < 40) { // Limit to prevent overflow
              pdf.text(attr, 20, attributesY + 10 + (index * 5));
            }
          });
        }

        // Save the PDF
        const fileName = options.title ? `${options.title}.pdf` : 'map_export.pdf';
        console.log("[EXPORT] Saving PDF as:", fileName);
        pdf.save(fileName);
        console.log("[EXPORT] PDF saved successfully");
      } catch (pdfErr) {
        // Fallback - just download the map image if PDF generation fails
        console.error("[EXPORT] PDF generation failed, falling back to image download:", pdfErr);
        const link = document.createElement('a');
        link.href = mapImage;
        link.download = options.title ? `${options.title}.png` : 'map_export.png';
        document.body.appendChild(link);
        console.log("[EXPORT] Triggering image download");
        link.click();
        document.body.removeChild(link);
        console.log("[EXPORT] Image download complete");
      }
    } catch (err) {
      console.error("[EXPORT] Export failed:", err.message);
      setError(`Export failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeature]);

  // Zoom to layer extent
  const zoomToLayerExtent = useCallback(async (layerId) => {
    console.log("[ZOOM] Attempting to zoom to layer extent:", layerId);

    if (!mapRef.current || !token) {
      console.error("[ZOOM] Cannot zoom - map or token missing");
      if (!token) handleUnauthorizedAccess();
      return;
    }

    try {
      setIsLoading(true);
      console.log("[ZOOM] Fetching layer extent from API");

      const extent = await fetchLayerExtent(API_BASE_URL, layerId, token);
      console.log("[ZOOM] Layer extent received:", extent);

      if (!extent) {
        console.error("[ZOOM] No extent data received from API");
        throw new Error('Failed to fetch layer extent');
      }

      // Convert extent to bounds
      const bounds = [
        [extent[0], extent[1]], // Southwest
        [extent[2], extent[3]]  // Northeast
      ];
      console.log("[ZOOM] Calculated bounds:", bounds);

      // Fit map to bounds
      console.log("[ZOOM] Fitting map to bounds");
      mapRef.current.fitBounds(bounds, {
        padding: 20,
        maxZoom: 16
      });
      console.log("[ZOOM] Map view updated to layer extent");

    } catch (err) {
      console.error("[ZOOM] Failed to zoom to layer:", err.message);
      setError(`Failed to zoom to layer: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [token, handleUnauthorizedAccess]);

  // Memoize props for child components to prevent unnecessary re-renders
  const layerControlProps = useMemo(() => ({
    districts,
    selectedDistrict,
    onDistrictChange: setSelectedDistrict,
    layers,
    activeLayers,
    onLayerAdd: loadLayer,
    onLayerRemove: removeLayer,
    onLayerOrderChange: reorderLayers,
    onZoomToLayer: zoomToLayerExtent
  }), [districts, selectedDistrict, layers, activeLayers, loadLayer, removeLayer, reorderLayers, zoomToLayerExtent]);

  const featurePanelProps = useMemo(() => ({
    feature: selectedFeature,
    khataNos,
    district: selectedDistrict,
    taluka: selectedLayer ? extractTalukaFromLayerId(selectedLayer.id) : '',
    hasMultipleFeatures: featureCollection.length > 1,
    onPrevFeature: () => navigateFeatures('prev'),
    onNextFeature: () => navigateFeatures('next'),
    onClose: () => {
      setSelectedFeature(null);
      setSidebarMode('layers');
    },
    onDownloadReport: handleReportDownload,
    onExport: () => {
      setSidebarMode('export');
      setExportOptions(prev => ({
        ...prev,
        includeAttributes: true
      }));
    }
  }), [selectedFeature, khataNos, selectedDistrict, selectedLayer, extractTalukaFromLayerId, featureCollection.length, navigateFeatures, handleReportDownload]);

  const searchPanelProps = useMemo(() => ({
    searchCoords,
    onCoordsChange: setSearchCoords,
    onSearch: () => searchByCoordinates(searchCoords.latitude, searchCoords.longitude),
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    onAddressSearch: handleAddressSearch,
    searchResults,
    onDownloadReport: handleReportDownload
  }), [searchCoords, searchByCoordinates, searchQuery, handleAddressSearch, searchResults, handleReportDownload]);

  const filterPanelProps = useMemo(() => ({
    activeLayers,
    selectedLayer: filterActiveLayer,
    onSelectLayer: setFilterActiveLayer,
    filterDefinitions,
    onUpdateFilter: updateLayerFilter,
    metadata: metadataCache.current
  }), [activeLayers, filterActiveLayer, filterDefinitions, updateLayerFilter]);

  const measurementToolsProps = useMemo(() => ({
    active: measurementActive,
    type: measurementType,
    result: measurementResult,
    onMeasurementStart: initMeasurement,
    onMeasurementClear: clearMeasurement
  }), [measurementActive, measurementType, measurementResult, initMeasurement, clearMeasurement]);

  const heatmapControlProps = useMemo(() => ({
    activeLayers,
    selectedLayer: heatmapLayer,
    selectedProperty: heatmapProperty,
    colorScheme: heatmapColorScheme,
    metadata: metadataCache.current,
    onGenerateHeatmap: generateHeatmap,
    onClearHeatmap: clearHeatmap
  }), [activeLayers, heatmapLayer, heatmapProperty, heatmapColorScheme, generateHeatmap, clearHeatmap]);

  const exportToolsProps = useMemo(() => ({
    options: exportOptions,
    onOptionsChange: setExportOptions,
    onExport: generateMapExport,
    hasFeature: !!selectedFeature
  }), [exportOptions, generateMapExport, selectedFeature]);

  return (
    <div className="map-container">
      {/* Login Popup */}
      {showLoginPopup && (
        <div className="auth-popup">
          <div className="auth-popup-content">
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
          {/* <MapStyleControl
            currentStyle={mapStyle}
            onStyleChange={setMapStyle}
          /> */}

          {layerPopupOpen && (
            <div className="layer-popup">
              <div className="popup-content">
                <LayerControl {...layerControlProps} setLayerPopupOpen={setLayerPopupOpen} />
              </div>
            </div>
          )}

          {/* Feature Panel */}
          {sidebarMode === 'feature' && selectedFeature && (
            <FeaturePanel {...featurePanelProps} />
          )}

          {/* Legend Panel - Always visible when sidebar is open */}
          {/* {expandedSidebar && activeLayers.length > 0 && (
            <LegendPanel
              activeLayers={activeLayers}
              metadata={metadataCache.current}
              style={{
                marginLeft: '200px', // Add left margin here
                paddingLeft: '20px'
              }} // Add left padding here
            />
          )} */}
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

      {/* Map Style Control at Top Right */}
      <div className="map-style-control">
        <MapStyleControl
          currentStyle={mapStyle}
          onStyleChange={setMapStyle}
        />
      </div>

      {/* Right Sidebar for Panels */}
      {['search', 'filter', 'measurement', 'heatmap', 'export'].includes(sidebarMode) && (
        <div className="right-sidebar">
          {sidebarMode === 'search' && <SearchPanel {...searchPanelProps} />}
          {sidebarMode === 'filter' && <FilterPanel {...filterPanelProps} />}
          {sidebarMode === 'measurement' && <MeasurementTools {...measurementToolsProps} />}
          {sidebarMode === 'heatmap' && <HeatmapControl {...heatmapControlProps} />}
          {sidebarMode === 'export' && <ExportTools {...exportToolsProps} />}
        </div>
      )}
    </div>
  );
}
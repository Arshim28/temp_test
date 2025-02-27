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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://65.2.140.129:8000/api';
const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || 'http://65.2.140.129:7800';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_CENTER = [75.7139, 21.0486];
const DEFAULT_ZOOM = 12;

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
  
  // Initialize token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    } else {
      handleUnauthorizedAccess();
    }
  }, []);
  
  // Fetch layers and districts when component mounts
  useEffect(() => {
    if (!token) return;
    
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const [layersData, districtsData] = await Promise.all([
          fetchLayers(TILE_SERVER_URL),
          fetchDistricts(API_BASE_URL, token)
        ]);
        
        setLayers(layersData);
        setDistricts(districtsData);
      } catch (err) {
        setError(`Failed to load initial data: ${err.message}`);
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [token]);
  
  // Handle unauthorized access
  const handleUnauthorizedAccess = useCallback(() => {
    setShowLoginPopup(true);
    setTimeout(() => {
      setShowLoginPopup(false);
      router.push('/login');
    }, 1000);
  }, [router]);
  
  // Initialize map based on mapStyle
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
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
      mapRef.current.remove();
    }
    
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
    
    // Add click event listener for feature info
    map.on('click', (e) => {
      if (infoModeActive) {
        handleFeatureInfoRequest(e);
      }
      
      if (measurementActive) {
        handleMeasurementClick(e);
      }
    });
    
    // Reload active layers when map style changes
    if (activeLayers.length > 0) {
      const reloadLayers = async () => {
        // Wait for map to load style
        if (!map.loaded()) {
          map.once('load', () => {
            activeLayers.forEach(layer => loadLayer(layer));
          });
        } else {
          activeLayers.forEach(layer => loadLayer(layer));
        }
      };
      
      map.once('load', () => {
        reloadLayers();
      });
    }
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [mapStyle, infoModeActive, measurementActive]);
  
  // Load a layer onto the map
  const loadLayer = async (layer) => {
    if (!mapRef.current || !token) return;
    
    const map = mapRef.current;
    
    // Skip if layer is already loaded
    if (activeLayers.find(activeLayer => activeLayer.id === layer.id)) {
      setSelectedLayer(layer);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch tile URL with authentication token
      const tileUrl = await fetchTileUrl(API_BASE_URL, layer.id, token);
      
      // Fetch layer metadata if not already cached
      if (!metadataCache.current[layer.id]) {
        const metadata = await fetchMetadata(TILE_SERVER_URL, layer.id);
        metadataCache.current[layer.id] = metadata;
      }
      
      const metadata = metadataCache.current[layer.id];
      const geometryType = metadata.geometrytype;
      
      if (!geometryType) {
        throw new Error(`Geometry type not found for layer: ${layer.name}`);
      }
      
      // Configure layer based on geometry type
      let layerType, paint = {};
      
      switch(geometryType) {
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
        map.removeLayer(layerId);
        map.removeSource(sourceId);
      }
      
      // Apply filter if exists for this layer
      let filter = null;
      if (filterDefinitions[layer.id]) {
        filter = createCQLFilter(filterDefinitions[layer.id]);
      }
      
      // Add source
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [filter ? `${tileUrl}&cql_filter=${encodeURIComponent(filter)}` : tileUrl],
        minzoom: 0,
        maxzoom: 22
      });
      
      // Add layer
      map.addLayer({
        id: layerId,
        type: layerType,
        source: sourceId,
        'source-layer': layer.id,
        paint: paint
      });
      
      // Add click event handler
      map.on('click', layerId, handleFeatureClick);
      
      // Add hover effect
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
      
      // Update state
      setActiveLayers(prev => [...prev, layer]);
      setLayerOrder(prev => [...prev, layer.id]);
      setSelectedLayer(layer);
      
      // Update other components
      updateLegend();
      
    } catch (err) {
      setError(`Failed to load layer: ${err.message}`);
      console.error('Error loading layer:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clicking on a feature
  const handleFeatureClick = (e) => {
    if (!mapRef.current || !infoModeActive) return;
    
    const feature = e.features[0];
    if (!feature) return;
    
    // Extract khata numbers if available
    const properties = feature.properties;
    const khataNo = properties.khata_no;
    
    let parsedKhataNos = [];
    if (khataNo) {
      parsedKhataNos = khataNo.split(',').map(k => k.trim());
    }
    
    // Update state
    setSelectedFeature(properties);
    setKhataNos(parsedKhataNos);
    setSidebarMode('feature');
    setExpandedSidebar(true);
    
    // Fly to feature
    const coordinates = e.lngLat;
    mapRef.current.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      essential: true
    });
  };
  
  // Load feature info for all layers at a point
  const handleFeatureInfoRequest = async (e) => {
    if (!mapRef.current || !token || activeLayers.length === 0) return;
    
    try {
      setIsLoading(true);
      
      const map = mapRef.current;
      const point = e.lngLat;
      
      // Fetch features for all active layers
      const results = await Promise.all(
        activeLayers.map(async (layer) => {
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
        })
      );
      
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
      console.error('Feature info error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle info mode
  const toggleInfoMode = () => {
    setInfoModeActive(!infoModeActive);
    
    // Update cursor
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = !infoModeActive ? 'help' : '';
    }
    
    // Turn off other tools
    if (!infoModeActive) {
      setMeasurementActive(false);
      setHeatmapActive(false);
    }
  };
  
  // Navigate between features in feature collection
  const navigateFeatures = (direction) => {
    if (featureCollection.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentFeatureIndex + 1) % featureCollection.length;
    } else {
      newIndex = (currentFeatureIndex - 1 + featureCollection.length) % featureCollection.length;
    }
    
    setCurrentFeatureIndex(newIndex);
    setSelectedFeature(featureCollection[newIndex]);
  };
  
  // Remove a layer from the map
  const removeLayer = (layer) => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const sourceId = `source-${layer.id}`;
    const layerId = `layer-${layer.id}`;
    
    // Remove event listeners
    map.off('click', layerId, handleFeatureClick);
    map.off('mouseenter', layerId);
    map.off('mouseleave', layerId);
    
    // Remove layer and source
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
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
    
    // Update legend
    updateLegend();
  };
  
  // Reorder layers
  const reorderLayers = (newOrder) => {
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
    const layers = Object.values(map.style._layers).filter(layer => 
      layer.metadata && layer.metadata.zIndex !== undefined
    );
    
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
  };
  
  // Handle searching by coordinates
  const searchByCoordinates = async (latitude, longitude) => {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setError('Please enter valid coordinates');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await fetchFeaturesByLatLng(API_BASE_URL, latitude, longitude, token);
      
      setSearchResults(results);
      
      // Fly to location
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [parseFloat(longitude), parseFloat(latitude)],
          zoom: 16,
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
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle searching by address/name
  const handleAddressSearch = async (query) => {
    if (!query) {
      setError('Please enter a search term');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await searchByAddress(NOMINATIM_URL, query);
      
      if (results.length === 0) {
        setError('No results found');
        return;
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
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle report download
  const handleReportDownload = async (khataNo, district, taluka, village) => {
    if (!khataNo || !district) {
      setError('Missing required information for report download');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        state: 'maharashtra',
        district: district.toLowerCase(),
        taluka: taluka ? taluka.toLowerCase() : '',
        village: village ? village.toLowerCase() : '',
        khata_no: khataNo
      });
      
      const response = await fetch(`${API_BASE_URL}/report-gen/?${params}`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate report. Status: ${response.status}`);
      }
      
      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${khataNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle sidebar expansion
  const toggleSidebar = (mode) => {
    if (sidebarMode === mode && expandedSidebar) {
      setExpandedSidebar(false);
    } else {
      setSidebarMode(mode);
      setExpandedSidebar(true);
    }
  };
  
  // Extract taluka from layer ID
  const extractTalukaFromLayerId = (layerId) => {
    if (!layerId || !layerId.includes('_cadastrals')) return '';
    return layerId.split('_cadastrals')[0].split('.')[1] || '';
  };
  
  // Update layer filter
  const updateLayerFilter = (layerId, filterDef) => {
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
  };
  
  // Initialize measurement tool
  const initMeasurement = (type) => {
    if (!mapRef.current) return;
    
    setMeasurementType(type);
    setMeasurementActive(true);
    setInfoModeActive(false);
    setHeatmapActive(false);
    
    // Clear previous measurements
    clearMeasurement();
    
    // Initialize measurement layer
    if (!measurementLayerRef.current) {
      const map = mapRef.current;
      
      map.addSource('measurement-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
      
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
      
      measurementLayerRef.current = {
        points: [],
        line: null
      };
    }
  };
  
  // Handle measurement click
  const handleMeasurementClick = (e) => {
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
  
  // Clear measurement
  const clearMeasurement = () => {
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
  };
  
  // Generate heatmap
  const generateHeatmap = (layerId, property, colorScheme) => {
    if (!mapRef.current || !layerId || !property) return;
    
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
    
    return colorRamps[scheme] || colorRamps.YlOrRd;
  };
  
  // Clear heatmap
  const clearHeatmap = () => {
    if (!mapRef.current || !heatmapLayer) return;
    
    const map = mapRef.current;
    const sourceId = `heatmap-source-${heatmapLayer}`;
    const layerId = `heatmap-${heatmapLayer}-heatmap`;
    
    // Remove layer and source
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    
    // Reset heatmap state
    setHeatmapActive(false);
    setHeatmapLayer(null);
    setHeatmapProperty('');
  };
  
  // Update legend
  const updateLegend = () => {
    // Nothing to implement here since it's handled by the LegendPanel component
    // Just a placeholder to maintain consistency with the original pseudocode
  };
  
  // Generate and download map export
  const generateMapExport = async (options) => {
    if (!mapRef.current) return;
    
    try {
      setIsLoading(true);
      
      const map = mapRef.current;
      
      // Generate a screenshot of the map
      const canvas = map.getCanvas();
      const mapImage = canvas.toDataURL('image/png');
      
      // Generate PDF report
      try {
        // Try to access jsPDF
        let jsPDF;
        if (window.jspdf) {
          jsPDF = window.jspdf.jsPDF;
        } else {
          // Dynamic import as fallback
          const jspdfModule = await import('jspdf');
          jsPDF = jspdfModule.default;
        }
        
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Add title if requested
        if (options.includeTitle && options.title) {
          pdf.setFontSize(18);
          pdf.text(options.title, 20, 20);
          pdf.setFontSize(12);
        }
        
        // Add map image if requested
        if (options.includeMap) {
          pdf.addImage(mapImage, 'PNG', 20, options.includeTitle ? 30 : 20, 250, 150);
        }
        
        // Add attributes if requested
        if (options.includeAttributes && selectedFeature) {
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
        pdf.save(options.title ? `${options.title}.pdf` : 'map_export.pdf');
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        // Fallback - just download the map image if PDF generation fails
        const link = document.createElement('a');
        link.href = mapImage;
        link.download = options.title ? `${options.title}.png` : 'map_export.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      console.error('Export error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Zoom to layer extent
  const zoomToLayerExtent = async (layerId) => {
    if (!mapRef.current || !token) return;
    
    try {
      setIsLoading(true);
      
      const extent = await fetchLayerExtent(API_BASE_URL, layerId, token);
      
      if (!extent) {
        throw new Error('Failed to fetch layer extent');
      }
      
      // Convert extent to bounds
      const bounds = [
        [extent[0], extent[1]], // Southwest
        [extent[2], extent[3]]  // Northeast
      ];
      
      // Fit map to bounds
      mapRef.current.fitBounds(bounds, {
        padding: 20,
        maxZoom: 16
      });
      
    } catch (err) {
      setError(`Failed to zoom to layer: ${err.message}`);
      console.error('Zoom to layer error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${expandedSidebar ? 'expanded' : ''}`}>
        {/* Sidebar Controls */}
        <div className="sidebar-controls">
          <button 
            className={`sidebar-control ${sidebarMode === 'layers' ? 'active' : ''}`} 
            onClick={() => toggleSidebar('layers')}
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
          {sidebarMode === 'layers' && (
            <LayerControl
              districts={districts}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              layers={layers}
              activeLayers={activeLayers}
              layerOrder={layerOrder}
              onLayerAdd={loadLayer}
              onLayerRemove={removeLayer}
              onLayerOrderChange={reorderLayers}
              onZoomToLayer={zoomToLayerExtent}
            />
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
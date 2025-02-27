/**
 * MapView API Service
 * This file contains all API calls related to the MapView component
 */

/**
 * Fetch all available layers from the tile server
 * @param {string} tileServerUrl - The base URL of the tile server
 * @returns {Promise<Array>} - Array of available layers
 */
export const fetchLayers = async (tileServerUrl) => {
  try {
    const response = await fetch(`${tileServerUrl}/index.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch layers: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch (error) {
    console.error('Error fetching layers:', error);
    throw error;
  }
};

/**
 * Fetch districts hierarchy data
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of districts
 */
export const fetchDistricts = async (apiBaseUrl, token) => {
  try {
    const response = await fetch(`${apiBaseUrl}/maharashtra-hierarchy/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch districts: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching districts:', error);
    throw error;
  }
};

/**
 * Fetch authenticated tile URL for a layer
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} layerId - ID of the layer
 * @param {string} token - Authentication token
 * @returns {Promise<string>} - Authenticated tile URL
 */
export const fetchTileUrl = async (apiBaseUrl, layerId, token) => {
  try {
    const response = await fetch(`${apiBaseUrl}/get_tile_url/?table=${layerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tile URL: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.tile_url) {
      throw new Error('No tile URL returned from server');
    }
    
    return data.tile_url;
  } catch (error) {
    console.error('Error fetching tile URL:', error);
    throw error;
  }
};

/**
 * Fetch metadata for a layer
 * @param {string} tileServerUrl - The base URL of the tile server
 * @param {string} layerId - ID of the layer
 * @returns {Promise<Object>} - Layer metadata
 */
export const fetchMetadata = async (tileServerUrl, layerId) => {
  try {
    const response = await fetch(`${tileServerUrl}/${layerId}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata:', error);
    throw error;
  }
};

/**
 * Fetch khata numbers for a location
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} district - District name
 * @param {string} taluka - Taluka name
 * @param {string} village - Village name
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of khata numbers
 */
export const fetchKhataNumbers = async (apiBaseUrl, district, taluka, village, token) => {
  try {
    const params = new URLSearchParams({
      district,
      taluka_name: taluka,
      village_name: village
    });
    
    const response = await fetch(`${apiBaseUrl}/khata-numbers/?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch khata numbers: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.khata_numbers || [];
  } catch (error) {
    console.error('Error fetching khata numbers:', error);
    throw error;
  }
};

/**
 * Fetch features by latitude and longitude
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of features
 */
export const fetchFeaturesByLatLng = async (apiBaseUrl, latitude, longitude, token) => {
  try {
    const params = new URLSearchParams({
      lat: latitude,
      lng: longitude
    });
    
    const response = await fetch(`${apiBaseUrl}/plot/?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch features: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching features by lat/lng:', error);
    throw error;
  }
};

/**
 * Fetch features for a point on the map
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} layerName - Layer name
 * @param {number} longitude - Longitude
 * @param {number} latitude - Latitude
 * @param {number} zoom - Current zoom level
 * @param {number} width - Map width in pixels
 * @param {number} height - Map height in pixels
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of features
 */
export const fetchFeaturesByPoint = async (apiBaseUrl, layerName, longitude, latitude, zoom, width, height, token) => {
  try {
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetFeatureInfo',
      LAYERS: layerName,
      QUERY_LAYERS: layerName,
      INFO_FORMAT: 'application/json',
      X: Math.round(width / 2),
      Y: Math.round(height / 2),
      BBOX: calculateBBOX(longitude, latitude, zoom, width, height),
      WIDTH: width,
      HEIGHT: height,
      SRS: 'EPSG:4326',
      FEATURE_COUNT: 10
    });
    
    const response = await fetch(`${apiBaseUrl}/proxy-wms/?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feature info: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching feature info:', error);
    throw error;
  }
};

/**
 * Calculate BBOX for WMS GetFeatureInfo request
 * @param {number} longitude - Center longitude
 * @param {number} latitude - Center latitude
 * @param {number} zoom - Current zoom level
 * @param {number} width - Map width in pixels
 * @param {number} height - Map height in pixels
 * @returns {string} - BBOX string in format "minLon,minLat,maxLon,maxLat"
 */
const calculateBBOX = (longitude, latitude, zoom, width, height) => {
  // Rough approximation of the visible extent
  const zoomFactor = Math.pow(2, zoom);
  const lonExtent = 360 / zoomFactor * (width / 256);
  const latExtent = 170 / zoomFactor * (height / 256);
  
  const minLon = longitude - lonExtent / 2;
  const maxLon = longitude + lonExtent / 2;
  const minLat = latitude - latExtent / 2;
  const maxLat = latitude + latExtent / 2;
  
  return `${minLon},${minLat},${maxLon},${maxLat}`;
};

/**
 * Search by address using Nominatim
 * @param {string} nominatimUrl - Nominatim API URL
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of search results
 */
export const searchByAddress = async (nominatimUrl, query) => {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: 5,
      addressdetails: 1
    });
    
    const response = await fetch(`${nominatimUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search address: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching address:', error);
    throw error;
  }
};

/**
 * Fetch the bounding box extent of a layer
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} layerId - Layer ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Bounding box [minLon, minLat, maxLon, maxLat]
 */
export const fetchLayerExtent = async (apiBaseUrl, layerId, token) => {
  try {
    const response = await fetch(`${apiBaseUrl}/layer-extent/?layer=${layerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch layer extent: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.extent;
  } catch (error) {
    console.error('Error fetching layer extent:', error);
    throw error;
  }
};

/**
 * Download a report for a feature
 * @param {string} apiBaseUrl - The base URL of the API
 * @param {string} state - State name
 * @param {string} district - District name
 * @param {string} taluka - Taluka name
 * @param {string} village - Village name
 * @param {string} khataNo - Khata number
 * @param {string} token - Authentication token
 * @returns {Promise<Blob>} - Report PDF as a Blob
 */
export const downloadReport = async (apiBaseUrl, state, district, taluka, village, khataNo, token) => {
  try {
    const params = new URLSearchParams({
      state,
      district: district.toLowerCase(),
      taluka: taluka ? taluka.toLowerCase() : '',
      village: village ? village.toLowerCase() : '',
      khata_no: khataNo
    });
    
    const response = await fetch(`${apiBaseUrl}/report-gen/?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

/**
 * Create a CQL filter string from filter definition
 * @param {Object} filterDef - Filter definition object
 * @returns {string} - CQL filter string
 */
export const createCQLFilter = (filterDef) => {
  if (!filterDef || !filterDef.conditions || filterDef.conditions.length === 0) {
    return '';
  }
  
  // Map conditions to CQL strings
  const conditions = filterDef.conditions.map(condition => {
    const { attribute, operator, value } = condition;
    
    // Skip invalid conditions
    if (!attribute || !operator) {
      return null;
    }
    
    // Handle different operator types
    switch (operator) {
      case '=':
      case '!=':
      case '>':
      case '>=':
      case '<':
      case '<=':
        return `${attribute} ${operator} ${formatCQLValue(value)}`;
      
      case 'LIKE':
        return `${attribute} LIKE '%${value}%'`;
      
      case 'IN':
        if (Array.isArray(value) && value.length > 0) {
          const formattedValues = value.map(v => formatCQLValue(v)).join(',');
          return `${attribute} IN (${formattedValues})`;
        }
        return null;
      
      case 'BETWEEN':
        if (Array.isArray(value) && value.length === 2) {
          return `${attribute} BETWEEN ${formatCQLValue(value[0])} AND ${formatCQLValue(value[1])}`;
        }
        return null;
      
      case 'IS NULL':
        return `${attribute} IS NULL`;
      
      case 'IS NOT NULL':
        return `${attribute} IS NOT NULL`;
      
      default:
        return null;
    }
  }).filter(Boolean); // Remove null conditions
  
  // Join conditions with AND/OR
  if (conditions.length === 0) {
    return '';
  } else if (conditions.length === 1) {
    return conditions[0];
  } else {
    const joinOperator = filterDef.joinOperator === 'OR' ? ' OR ' : ' AND ';
    return conditions.join(joinOperator);
  }
};

/**
 * Format a value for CQL filter
 * @param {*} value - Value to format
 * @returns {string} - Formatted value
 */
const formatCQLValue = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    // Escape single quotes
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  
  return `'${value}'`;
};
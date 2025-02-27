'use client';

import { useState, useEffect } from 'react';

/**
 * Component for generating heatmaps from layer data
 * @param {Object} props - Component props
 * @param {Array} props.activeLayers - List of active layers
 * @param {string} props.selectedLayer - Currently selected layer ID
 * @param {string} props.selectedProperty - Selected property for heatmap
 * @param {string} props.colorScheme - Selected color scheme
 * @param {Object} props.metadata - Layer metadata cache
 * @param {Function} props.onGenerateHeatmap - Callback for generating heatmap
 * @param {Function} props.onClearHeatmap - Callback for clearing heatmap
 */
export default function HeatmapControl({
  activeLayers,
  selectedLayer,
  selectedProperty,
  colorScheme,
  metadata,
  onGenerateHeatmap,
  onClearHeatmap
}) {
  // State for selected heatmap options
  const [layerId, setLayerId] = useState(selectedLayer || '');
  const [property, setProperty] = useState(selectedProperty || '');
  const [scheme, setScheme] = useState(colorScheme || 'YlOrRd');
  
  // State for available numeric properties
  const [numericProperties, setNumericProperties] = useState([]);
  
  // Available color schemes
  const colorSchemes = [
    { id: 'YlOrRd', name: 'Yellow-Orange-Red' },
    { id: 'BuRd', name: 'Blue-Red' },
    { id: 'GnRd', name: 'Green-Red' },
    { id: 'WhBu', name: 'White-Blue' }
  ];
  
  // Track if the selected layer has changed
  useEffect(() => {
    if (selectedLayer) {
      setLayerId(selectedLayer);
    }
  }, [selectedLayer]);
  
  // Update numeric properties when layer changes
  useEffect(() => {
    if (!layerId) {
      setNumericProperties([]);
      return;
    }
    
    if (metadata && metadata[layerId]) {
      const layerMeta = metadata[layerId];
      if (layerMeta.properties) {
        // Filter only numeric properties
        const numProps = layerMeta.properties.filter(prop => {
          const type = prop.type.toLowerCase();
          return ['int2', 'int4', 'int8', 'integer', 'bigint', 'smallint', 
                  'float4', 'float8', 'real', 'double precision', 'numeric'].includes(type);
        });
        
        setNumericProperties(numProps);
        
        // Reset property if not in the list
        if (numProps.length > 0 && !numProps.some(p => p.name === property)) {
          setProperty(numProps[0].name);
        }
      }
    }
  }, [layerId, metadata, property]);
  
  // Generate the heatmap
  const handleGenerateHeatmap = () => {
    if (!layerId || !property) {
      alert('Please select a layer and property');
      return;
    }
    
    onGenerateHeatmap(layerId, property, scheme);
  };
  
  return (
    <div className="heatmap-control">
      <h3 className="section-heading">Heatmap Generator</h3>
      
      {/* Layer Selection */}
      <div className="form-group">
        <label htmlFor="heatmap-layer-select">Select Layer:</label>
        <select
          id="heatmap-layer-select"
          value={layerId}
          onChange={(e) => setLayerId(e.target.value)}
          className="heatmap-select"
        >
          <option value="">-- Select Layer --</option>
          {activeLayers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name || layer.id}
            </option>
          ))}
        </select>
      </div>
      
      {layerId && (
        <>
          {/* Property Selection */}
          <div className="form-group">
            <label htmlFor="property-select">Select Numeric Property:</label>
            {numericProperties.length > 0 ? (
              <select
                id="property-select"
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                className="property-select"
              >
                <option value="">-- Select Property --</option>
                {numericProperties.map((prop) => (
                  <option key={prop.name} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
              </select>
            ) : (
              <div className="no-numeric-properties">
                <p>No numeric properties available for this layer</p>
              </div>
            )}
          </div>
          
          {/* Color Scheme Selection */}
          {property && (
            <div className="form-group">
              <label>Color Scheme:</label>
              <div className="color-schemes">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    className={`color-scheme-btn ${scheme.id === colorScheme ? 'active' : ''}`}
                    onClick={() => setScheme(scheme.id)}
                    title={scheme.name}
                    aria-label={scheme.name}
                  >
                    <div className={`color-scheme-preview ${scheme.id}`}></div>
                    <span>{scheme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="heatmap-actions">
            <button
              className="generate-heatmap-btn"
              onClick={handleGenerateHeatmap}
              disabled={!property}
            >
              Generate Heatmap
            </button>
            <button
              className="clear-heatmap-btn"
              onClick={onClearHeatmap}
            >
              Clear Heatmap
            </button>
          </div>
          
          {/* Preview or Legend */}
          {selectedLayer && selectedProperty && (
            <div className="heatmap-legend">
              <h4>Heatmap Legend</h4>
              <div className={`heatmap-gradient ${colorScheme}`}>
                <span>Low</span>
                <span>High</span>
              </div>
              <p>
                Displaying heatmap of <strong>{selectedProperty}</strong> from {' '}
                <strong>{activeLayers.find(l => l.id === selectedLayer)?.name || selectedLayer}</strong>
              </p>
            </div>
          )}
        </>
      )}
      
      {!layerId && (
        <div className="no-layer-message">
          <p>Please select a layer to create a heatmap</p>
        </div>
      )}
    </div>
  );
}
'use client';

/**
 * Component for displaying map legend
 * @param {Object} props - Component props
 * @param {Array} props.activeLayers - List of active layers
 * @param {Object} props.metadata - Layer metadata cache
 */
export default function LegendPanel({ activeLayers, metadata }) {
  // If no active layers, return nothing
  if (activeLayers.length === 0) {
    return null;
  }
  
  return (
    <div className="legend-panel">
      <h3 className="section-heading">Legend</h3>
      
      <div className="legend-items">
        {activeLayers.map((layer) => {
          const layerMeta = metadata[layer.id];
          const layerName = layer.name || layer.id;
          
          // Get geometry type for styling the legend symbol
          const geometryType = layerMeta?.geometrytype || 'unknown';
          
          return (
            <div key={layer.id} className="legend-item">
              <div className={`legend-symbol ${geometryType.toLowerCase()}`}></div>
              <div className="legend-label">{layerName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

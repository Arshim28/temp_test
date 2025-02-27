'use client';

/**
 * Component for managing map layers
 * @param {Object} props - Component props
 * @param {Array} props.districts - List of available districts
 * @param {string} props.selectedDistrict - Currently selected district
 * @param {Function} props.onDistrictChange - Callback for district change
 * @param {Array} props.layers - List of available layers
 * @param {Array} props.activeLayers - List of currently active layers
 * @param {Function} props.onLayerAdd - Callback for adding a layer
 * @param {Function} props.onLayerRemove - Callback for removing a layer
 */
export default function LayerControl({
  districts,
  selectedDistrict,
  onDistrictChange,
  layers,
  activeLayers,
  onLayerAdd,
  onLayerRemove
}) {
  // Filter layers based on district selection if a district is selected
  // This filtering logic can be adjusted based on your layer naming convention
  const filteredLayers = layers.filter(layer => {
    if (!selectedDistrict) return true;
    
    // Check if layer ID or name contains the district name
    const district = selectedDistrict.toLowerCase();
    const layerId = (layer.id || '').toLowerCase();
    const layerName = (layer.name || '').toLowerCase();
    
    return layerId.includes(district) || layerName.includes(district);
  });

  return (
    <div className="layer-control">
      <div className="district-selector">
        <h3 className="section-heading">Select District</h3>
        <select 
          value={selectedDistrict} 
          onChange={(e) => onDistrictChange(e.target.value)}
          className="district-select"
        >
          <option value="">All Districts</option>
          {districts.map(district => {
            // Handle both array of objects and array of strings
            const name = typeof district === 'object' ? district.name : district;
            const id = typeof district === 'object' ? (district.code || district.name) : district;
            
            return (
              <option key={id} value={name}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="layers-list">
        <h3 className="section-heading">Available Layers</h3>
        {filteredLayers.length === 0 ? (
          <p className="no-layers-message">No layers available for selected district</p>
        ) : (
          filteredLayers.map(layer => {
            const isActive = activeLayers.some(activeLayer => activeLayer.id === layer.id);
            return (
              <div 
                key={layer.id} 
                className={`layer-option ${isActive ? 'active' : ''}`}
                onClick={() => onLayerAdd(layer)}
              >
                <span className="layer-name">{layer.name || layer.id}</span>
                {isActive && (
                  <button 
                    className="remove-layer-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerRemove(layer);
                    }}
                    title="Remove Layer"
                  >
                    ✖
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {activeLayers.length > 0 && (
        <div className="active-layers">
          <h3 className="section-heading">Active Layers</h3>
          <div className="active-layers-list">
            {activeLayers.map(layer => (
              <div key={layer.id} className="active-layer-item">
                <span className="layer-name">{layer.name || layer.id}</span>
                <button 
                  className="remove-layer-btn" 
                  onClick={() => onLayerRemove(layer)}
                  title="Remove Layer"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
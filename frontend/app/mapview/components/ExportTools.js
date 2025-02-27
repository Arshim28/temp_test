'use client';

/**
 * Component for exporting map and feature data
 * @param {Object} props - Component props
 * @param {Object} props.options - Export options
 * @param {Function} props.onOptionsChange - Callback for changing options
 * @param {Function} props.onExport - Callback for initiating export
 * @param {boolean} props.hasFeature - Whether a feature is selected
 */
export default function ExportTools({
  options,
  onOptionsChange,
  onExport,
  hasFeature
}) {
  // Update a specific option
  const updateOption = (key, value) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };
  
  return (
    <div className="export-tools">
      <h3 className="section-heading">Export Tools</h3>
      
      {/* Export Options */}
      <div className="export-options">
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.includeMap}
              onChange={(e) => updateOption('includeMap', e.target.checked)}
            />
            Include Map View
          </label>
        </div>
        
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.includeAttributes}
              onChange={(e) => updateOption('includeAttributes', e.target.checked)}
              disabled={!hasFeature}
            />
            Include Feature Attributes
            {!hasFeature && <span className="disabled-note">(No feature selected)</span>}
          </label>
        </div>
        
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.includeTitle}
              onChange={(e) => updateOption('includeTitle', e.target.checked)}
            />
            Include Title
          </label>
          
          {options.includeTitle && (
            <input
              type="text"
              className="title-input"
              value={options.title}
              onChange={(e) => updateOption('title', e.target.value)}
              placeholder="Enter export title"
            />
          )}
        </div>
      </div>
      
      {/* Export Buttons */}
      <div className="export-actions">
        <button
          className="export-pdf-btn"
          onClick={() => onExport(options)}
        >
          Export as PDF
        </button>
        
        <button
          className="export-image-btn"
          onClick={() => {
            const mapOnlyOptions = {
              ...options,
              includeAttributes: false
            };
            onExport(mapOnlyOptions);
          }}
        >
          Export Map Image Only
        </button>
        
        {hasFeature && (
          <button
            className="export-attributes-btn"
            onClick={() => {
              const attributesOnlyOptions = {
                ...options,
                includeMap: false,
                includeAttributes: true
              };
              onExport(attributesOnlyOptions);
            }}
          >
            Export Attributes Only
          </button>
        )}
      </div>
      
      {/* Help Section */}
      <div className="export-help">
        <h4>Export Notes</h4>
        <ul>
          <li>PDF exports include both map and data (if selected)</li>
          <li>Image exports include only the current map view</li>
          <li>To export data for a specific feature, first select it using the Info tool</li>
          <li>For best results, adjust the map view before exporting</li>
        </ul>
      </div>
    </div>
  );
}
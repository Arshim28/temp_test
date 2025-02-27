'use client';

/**
 * Component for measuring distances and areas on the map
 * @param {Object} props - Component props
 * @param {boolean} props.active - Whether measurement is active
 * @param {string} props.type - Measurement type ('distance' or 'area')
 * @param {Object} props.result - Current measurement result
 * @param {Function} props.onMeasurementStart - Callback for starting measurement
 * @param {Function} props.onMeasurementClear - Callback for clearing measurement
 */
export default function MeasurementTools({
  active,
  type,
  result,
  onMeasurementStart,
  onMeasurementClear
}) {
  return (
    <div className="measurement-tools">
      <h3 className="section-heading">Measurement Tools</h3>
      
      {/* Measurement Type Buttons */}
      <div className="measurement-type-buttons">
        <button
          className={`measurement-type-btn ${type === 'distance' && active ? 'active' : ''}`}
          onClick={() => onMeasurementStart('distance')}
        >
          <span role="img" aria-label="Distance">📏</span>
          Distance
        </button>
        <button
          className={`measurement-type-btn ${type === 'area' && active ? 'active' : ''}`}
          onClick={() => onMeasurementStart('area')}
        >
          <span role="img" aria-label="Area">📐</span>
          Area
        </button>
      </div>
      
      {/* Instructions */}
      {active && (
        <div className="measurement-instructions">
          <p>
            {type === 'distance'
              ? 'Click on the map to add points to the distance measurement. The distance will be calculated as you add points.'
              : 'Click on the map to draw a polygon. The area will be calculated when you have at least 3 points.'}
          </p>
        </div>
      )}
      
      {/* Measurement Result */}
      {active && result && (
        <div className="measurement-result-panel">
          <h4>Measurement Result</h4>
          <div className="result-value">
            <strong>{result.type === 'distance' ? 'Distance' : 'Area'}:</strong> 
            {result.value} {result.unit}
          </div>
        </div>
      )}
      
      {/* Clear Button */}
      {active && (
        <button
          className="clear-measurement-btn"
          onClick={onMeasurementClear}
        >
          Clear Measurement
        </button>
      )}
      
      {/* Help Section */}
      <div className="measurement-help">
        <h4>How to use</h4>
        <ul>
          <li>Select the measurement type (distance or area)</li>
          <li>Click on the map to add points</li>
          <li>For distance: Each click adds a segment to the measurement</li>
          <li>For area: Click at least 3 points to form a polygon</li>
          <li>The measurement result will update automatically</li>
          <li>Click "Clear Measurement" to start over</li>
        </ul>
      </div>
    </div>
  );
}
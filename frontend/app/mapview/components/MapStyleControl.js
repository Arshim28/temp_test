'use client';

/**
 * Component for selecting map style/basemap
 * @param {Object} props - Component props
 * @param {string} props.currentStyle - Current selected style
 * @param {Function} props.onStyleChange - Callback for style change
 */
export default function MapStyleControl({ currentStyle, onStyleChange }) {
  return (
    <div className="map-style-control">
      <label htmlFor="map-style-select">Map Style:</label>
      <select
        id="map-style-select"
        value={currentStyle}
        onChange={(e) => onStyleChange(e.target.value)}
        className="map-style-select"
      >
        <option value="base">Street Map</option>
        <option value="satellite">Satellite</option>
        <option value="hybrid">Hybrid</option>
      </select>
    </div>
  );
}
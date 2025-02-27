'use client';

import { useState } from 'react';

/**
 * Component for searching by coordinates
 * @param {Object} props - Component props
 * @param {Object} props.searchCoords - Current search coordinates
 * @param {Function} props.onCoordsChange - Callback for coordinate changes
 * @param {Function} props.onSearch - Callback for initiating search
 * @param {Array} props.searchResults - Search results
 * @param {Function} props.onDownloadReport - Callback for downloading report
 */
export default function SearchPanel({
  searchCoords,
  onCoordsChange,
  onSearch,
  searchResults,
  onDownloadReport
}) {
  const [selectedResult, setSelectedResult] = useState(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };
  
  return (
    <div className="search-panel">
      <h3 className="section-heading">Search by Coordinates</h3>
      
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="latitude">Latitude:</label>
          <input
            id="latitude"
            type="text"
            value={searchCoords.latitude}
            onChange={(e) => onCoordsChange({
              ...searchCoords,
              latitude: e.target.value
            })}
            placeholder="E.g., 18.9750"
            required
            className="coord-input"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="longitude">Longitude:</label>
          <input
            id="longitude"
            type="text"
            value={searchCoords.longitude}
            onChange={(e) => onCoordsChange({
              ...searchCoords,
              longitude: e.target.value
            })}
            placeholder="E.g., 72.8233"
            required
            className="coord-input"
          />
        </div>
        
        <button type="submit" className="search-btn">Search</button>
      </form>
      
      {searchResults && searchResults.length > 0 ? (
        <div className="search-results">
          <h3 className="section-heading">Results</h3>
          
          <div className="results-list">
            {searchResults.map((result, index) => (
              <div 
                key={`${result.khata_no || 'unknown'}-${index}`}
                className={`result-item ${selectedResult === result ? 'selected' : ''}`}
                onClick={() => setSelectedResult(result)}
              >
                <h4>Khata No: {result.khata_no || 'Unknown'}</h4>
                {result.district && <p><strong>District:</strong> {result.district}</p>}
                {result.village_name && <p><strong>Village:</strong> {result.village_name}</p>}
                {result.owner_names && <p><strong>Owners:</strong> {result.owner_names}</p>}
                
                {result.khata_no && (
                  <button
                    className="download-result-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadReport(
                        result.khata_no,
                        result.district || '',
                        result.taluka || '',
                        result.village_name || ''
                      );
                    }}
                  >
                    Download Report
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-results">
          <p>Search for coordinates to see results</p>
        </div>
      )}
    </div>
  );
}
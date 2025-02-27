'use client';

import { useState } from 'react';

/**
 * Component for displaying selected feature information
 * @param {Object} props - Component props
 * @param {Object} props.feature - Feature properties to display
 * @param {Array} props.khataNos - List of khata numbers
 * @param {string} props.district - District name
 * @param {string} props.taluka - Taluka name
 * @param {Function} props.onClose - Callback for closing the panel
 * @param {Function} props.onDownloadReport - Callback for downloading report
 */
export default function FeaturePanel({
  feature,
  khataNos,
  district,
  taluka,
  onClose,
  onDownloadReport
}) {
  const [selectedKhataNo, setSelectedKhataNo] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  
  // Check if feature is valid
  if (!feature) {
    return (
      <div className="feature-panel">
        <div className="feature-panel-header">
          <h3>Feature Information</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <p className="no-feature-message">No feature selected</p>
      </div>
    );
  }
  
  // Handle report download
  const handleDownload = () => {
    if (!selectedKhataNo && khataNos.length > 0) {
      setShowWarning(true);
      return;
    }
    
    // Use first khata if none selected or provided
    const khataToUse = selectedKhataNo || (khataNos.length > 0 ? khataNos[0] : feature.khata_no);
    
    if (!khataToUse) {
      setShowWarning(true);
      return;
    }
    
    setShowWarning(false);
    onDownloadReport(
      khataToUse,
      district,
      taluka,
      feature.vil_name || feature.village_name || ''
    );
  };
  
  // Extract village name from feature
  const villageName = feature.vil_name || feature.village_name || '';
  
  return (
    <div className="feature-panel">
      <div className="feature-panel-header">
        <h3>Feature Information</h3>
        <button className="close-btn" onClick={onClose} title="Close">✖</button>
      </div>
      
      {showWarning && (
        <div className="warning-message">
          Please select a Khata number
        </div>
      )}
      
      {khataNos.length > 0 ? (
        <div className="khata-selector">
          <label htmlFor="khata-select">Select Khata Number:</label>
          <select
            id="khata-select"
            value={selectedKhataNo}
            onChange={(e) => {
              setSelectedKhataNo(e.target.value);
              setShowWarning(false);
            }}
            className="khata-select"
          >
            <option value="">-- Select --</option>
            {khataNos.map(khata => (
              <option key={khata} value={khata}>{khata}</option>
            ))}
          </select>
        </div>
      ) : feature.khata_no ? (
        <div className="feature-info-item">
          <strong>Khata Number:</strong> {feature.khata_no}
        </div>
      ) : null}
      
      {/* Show location info */}
      {(district || feature.district) && (
        <div className="feature-info-item">
          <strong>District:</strong> {district || feature.district}
        </div>
      )}
      
      {(taluka || feature.taluka) && (
        <div className="feature-info-item">
          <strong>Taluka:</strong> {taluka || feature.taluka}
        </div>
      )}
      
      {villageName && (
        <div className="feature-info-item">
          <strong>Village:</strong> {villageName}
        </div>
      )}
      
      <button 
        className="download-btn"
        onClick={handleDownload}
      >
        Download Report
      </button>
      
      <div className="feature-properties">
        <h4>Properties</h4>
        <div className="properties-list">
          {Object.entries(feature)
            .filter(([key]) => 
              !['geometry', 'bbox', 'id'].includes(key.toLowerCase()) &&
              key !== 'khata_no' && key !== 'district' && key !== 'taluka' &&
              key !== 'vil_name' && key !== 'village_name'
            )
            .map(([key, value]) => (
              <div key={key} className="property-item">
                <strong>{key}:</strong> {value !== null ? value : 'N/A'}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
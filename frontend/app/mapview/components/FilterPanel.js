'use client';

import { useState, useEffect } from 'react';

/**
 * Component for filtering layer data using CQL
 * @param {Object} props - Component props
 * @param {Array} props.activeLayers - List of active layers
 * @param {Object} props.selectedLayer - Currently selected layer for filtering
 * @param {Function} props.onSelectLayer - Callback for selecting a layer
 * @param {Object} props.filterDefinitions - Current filter definitions
 * @param {Function} props.onUpdateFilter - Callback for updating a filter
 * @param {Object} props.metadata - Layer metadata cache
 */
export default function FilterPanel({
  activeLayers,
  selectedLayer,
  onSelectLayer,
  filterDefinitions,
  onUpdateFilter,
  metadata
}) {
  // State for the current filter being edited
  const [currentFilter, setCurrentFilter] = useState({
    conditions: [],
    joinOperator: 'AND'
  });
  
  // State for the current condition being edited
  const [currentCondition, setCurrentCondition] = useState({
    attribute: '',
    operator: '=',
    value: ''
  });
  
  // Get layer attributes from metadata
  const [layerAttributes, setLayerAttributes] = useState([]);
  
  // Track if the selected layer has changed
  useEffect(() => {
    if (selectedLayer) {
      // Load existing filter for this layer or create a new one
      const existingFilter = filterDefinitions[selectedLayer] || {
        conditions: [],
        joinOperator: 'AND'
      };
      
      setCurrentFilter(existingFilter);
      
      // Get attributes from metadata
      if (metadata && metadata[selectedLayer]) {
        const layerMeta = metadata[selectedLayer];
        if (layerMeta.properties) {
          setLayerAttributes(layerMeta.properties);
        }
      }
    } else {
      // Reset filter when no layer is selected
      setCurrentFilter({
        conditions: [],
        joinOperator: 'AND'
      });
      setLayerAttributes([]);
    }
  }, [selectedLayer, filterDefinitions, metadata]);
  
  // Add a condition to the filter
  const addCondition = () => {
    // Validate condition
    if (!currentCondition.attribute) {
      alert('Please select an attribute');
      return;
    }
    
    // Special case for IS NULL and IS NOT NULL
    if (currentCondition.operator === 'IS NULL' || currentCondition.operator === 'IS NOT NULL') {
      // No value needed for these operators
    } else if (!currentCondition.value && currentCondition.value !== 0) {
      alert('Please enter a value');
      return;
    }
    
    // Add condition to the filter
    const updatedFilter = {
      ...currentFilter,
      conditions: [...currentFilter.conditions, { ...currentCondition }]
    };
    
    setCurrentFilter(updatedFilter);
    
    // Reset current condition
    setCurrentCondition({
      attribute: '',
      operator: '=',
      value: ''
    });
  };
  
  // Remove a condition from the filter
  const removeCondition = (index) => {
    const updatedConditions = [...currentFilter.conditions];
    updatedConditions.splice(index, 1);
    
    const updatedFilter = {
      ...currentFilter,
      conditions: updatedConditions
    };
    
    setCurrentFilter(updatedFilter);
  };
  
  // Apply the filter
  const applyFilter = () => {
    if (!selectedLayer) return;
    
    onUpdateFilter(selectedLayer, currentFilter);
  };
  
  // Clear the filter
  const clearFilter = () => {
    if (!selectedLayer) return;
    
    setCurrentFilter({
      conditions: [],
      joinOperator: 'AND'
    });
    
    onUpdateFilter(selectedLayer, null);
  };
  
  // Get appropriate input type based on attribute type
  const getInputTypeForAttribute = (attributeName) => {
    const attribute = layerAttributes.find(attr => attr.name === attributeName);
    
    if (!attribute) return 'text';
    
    // Map PostgreSQL/GIS types to HTML input types
    switch (attribute.type.toLowerCase()) {
      case 'int2':
      case 'int4':
      case 'int8':
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'float4':
      case 'float8':
      case 'real':
      case 'double precision':
      case 'numeric':
        return 'number';
      
      case 'date':
        return 'date';
      
      case 'timestamp':
      case 'timestamptz':
        return 'datetime-local';
      
      case 'time':
      case 'timetz':
        return 'time';
      
      case 'bool':
      case 'boolean':
        return 'checkbox';
      
      default:
        return 'text';
    }
  };
  
  // Get operators based on attribute type
  const getOperatorsForAttribute = (attributeName) => {
    const attribute = layerAttributes.find(attr => attr.name === attributeName);
    
    if (!attribute) {
      // Default operators for unknown attribute types
      return ['=', '!=', 'LIKE', 'IS NULL', 'IS NOT NULL'];
    }
    
    // Get type-specific operators
    const type = attribute.type.toLowerCase();
    
    if (['int2', 'int4', 'int8', 'integer', 'bigint', 'smallint', 'float4', 'float8', 'real', 'double precision', 'numeric'].includes(type)) {
      return ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IN', 'IS NULL', 'IS NOT NULL'];
    }
    
    if (['date', 'timestamp', 'timestamptz'].includes(type)) {
      return ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];
    }
    
    if (['bool', 'boolean'].includes(type)) {
      return ['=', 'IS NULL', 'IS NOT NULL'];
    }
    
    // Default for strings and other types
    return ['=', '!=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];
  };
  
  return (
    <div className="filter-panel">
      <h3 className="section-heading">Filter Data</h3>
      
      {/* Layer Selection */}
      <div className="filter-layer-selector">
        <label htmlFor="layer-select">Select Layer:</label>
        <select
          id="layer-select"
          value={selectedLayer || ''}
          onChange={(e) => onSelectLayer(e.target.value || null)}
          className="layer-select"
        >
          <option value="">-- Select Layer --</option>
          {activeLayers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name || layer.id}
            </option>
          ))}
        </select>
      </div>
      
      {selectedLayer && (
        <>
          {/* Join Operator */}
          <div className="filter-join-selector">
            <label>Join Conditions With:</label>
            <div className="join-buttons">
              <button
                className={`join-button ${currentFilter.joinOperator === 'AND' ? 'active' : ''}`}
                onClick={() => setCurrentFilter({ ...currentFilter, joinOperator: 'AND' })}
              >
                AND
              </button>
              <button
                className={`join-button ${currentFilter.joinOperator === 'OR' ? 'active' : ''}`}
                onClick={() => setCurrentFilter({ ...currentFilter, joinOperator: 'OR' })}
              >
                OR
              </button>
            </div>
          </div>
          
          {/* Current Conditions */}
          {currentFilter.conditions.length > 0 && (
            <div className="current-conditions">
              <h4>Current Conditions</h4>
              <ul className="conditions-list">
                {currentFilter.conditions.map((condition, index) => (
                  <li key={index} className="condition-item">
                    <span className="condition-text">
                      {condition.attribute} {condition.operator} {condition.value}
                    </span>
                    <button
                      className="remove-condition-btn"
                      onClick={() => removeCondition(index)}
                      title="Remove Condition"
                    >
                      ✖
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* New Condition Form */}
          <div className="new-condition-form">
            <h4>Add Condition</h4>
            
            {/* Attribute */}
            <div className="form-group">
              <label htmlFor="attribute-select">Attribute:</label>
              <select
                id="attribute-select"
                value={currentCondition.attribute}
                onChange={(e) => setCurrentCondition({
                  ...currentCondition,
                  attribute: e.target.value
                })}
                className="attribute-select"
              >
                <option value="">-- Select Attribute --</option>
                {layerAttributes.map((attr) => (
                  <option key={attr.name} value={attr.name}>
                    {attr.name} ({attr.type})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Operator */}
            {currentCondition.attribute && (
              <div className="form-group">
                <label htmlFor="operator-select">Operator:</label>
                <select
                  id="operator-select"
                  value={currentCondition.operator}
                  onChange={(e) => setCurrentCondition({
                    ...currentCondition,
                    operator: e.target.value
                  })}
                  className="operator-select"
                >
                  {getOperatorsForAttribute(currentCondition.attribute).map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Value (not shown for IS NULL and IS NOT NULL) */}
            {currentCondition.attribute && 
             currentCondition.operator !== 'IS NULL' && 
             currentCondition.operator !== 'IS NOT NULL' && (
              <div className="form-group">
                <label htmlFor="value-input">Value:</label>
                <input
                  id="value-input"
                  type={getInputTypeForAttribute(currentCondition.attribute)}
                  value={currentCondition.value}
                  onChange={(e) => setCurrentCondition({
                    ...currentCondition,
                    value: e.target.type === 'checkbox' ? e.target.checked : e.target.value
                  })}
                  className="value-input"
                />
              </div>
            )}
            
            {/* Add Condition Button */}
            <button
              className="add-condition-btn"
              onClick={addCondition}
              disabled={!currentCondition.attribute}
            >
              Add Condition
            </button>
          </div>
          
          {/* Actions */}
          <div className="filter-actions">
            <button
              className="apply-filter-btn"
              onClick={applyFilter}
              disabled={currentFilter.conditions.length === 0}
            >
              Apply Filter
            </button>
            <button
              className="clear-filter-btn"
              onClick={clearFilter}
            >
              Clear Filter
            </button>
          </div>
        </>
      )}
      
      {!selectedLayer && (
        <div className="no-layer-message">
          <p>Please select a layer to filter</p>
        </div>
      )}
    </div>
  );
}
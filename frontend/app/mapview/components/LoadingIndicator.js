'use client';

/**
 * Component for showing loading indicator
 */
export default function LoadingIndicator() {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
}
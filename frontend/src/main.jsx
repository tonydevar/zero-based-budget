import React from 'react';
import ReactDOM from 'react-dom/client';

// Frontend implementation will be added in Feature 2 (Budget View & Core UI Layout)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', color: '#1e293b' }}>
      <h1>Zero-Based Budget</h1>
      <p>Backend API is running. Frontend implementation coming in Feature 2.</p>
      <p>
        API Health:{' '}
        <a href="http://localhost:3001/api/health">http://localhost:3001/api/health</a>
      </p>
    </div>
  </React.StrictMode>
);

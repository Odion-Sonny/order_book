import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// We will build this next
const Dashboard = () => (
  <div className="layout">
    <div className="center-content">
      <h1 className="glow-text">Trading Dashboard Pro</h1>
      <p>Building the next generation workstation...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trade" replace />} />
        <Route path="/trade" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

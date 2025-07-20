// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout';
import Overview from './pages/overview';
import DeviceManagement from './pages/DeviceManagement';

// Placeholder untuk halaman-halaman lain yang belum dibuat
// Halaman ini akan diisi dengan konten yang sesuai nanti
const Analytics = () => <div></div>;
const Reports = () => <div></div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="devices" element={<DeviceManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
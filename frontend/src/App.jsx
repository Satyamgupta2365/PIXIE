import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import DemoOne from './components/demo';

import TrainingResultsPage from './pages/TrainingResultsPage';
import OperationsHubPage from './pages/OperationsHubPage';
import SatelliteDashboard from './pages/SatelliteDashboard';
import RoverDashboard from './pages/RoverDashboard';
import CollisionDetailPage from './pages/CollisionDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoOne />} />
        <Route path="/operations" element={<OperationsHubPage />} />

        <Route path="/training" element={<TrainingResultsPage />} />
        <Route path="/satellites" element={<SatelliteDashboard />} />
        <Route path="/rovers" element={<RoverDashboard />} />
        <Route path="/collision/:id" element={<CollisionDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

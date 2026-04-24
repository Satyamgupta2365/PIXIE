import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import DemoOne from './components/demo';
import MissionSelectPage from './pages/MissionSelectPage';
import MissionDetailsDashboard from './pages/MissionDetailsDashboard';
import LiveLaunchDashboard from './pages/LiveLaunchDashboard';
import TrainingResultsPage from './pages/TrainingResultsPage';
import PastLaunchesPage from './pages/PastLaunchesPage';
import OperationsHubPage from './pages/OperationsHubPage';
import SatelliteDashboard from './pages/SatelliteDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoOne />} />
        <Route path="/operations" element={<OperationsHubPage />} />
        <Route path="/missions" element={<MissionSelectPage />} />
        <Route path="/missions/:id" element={<MissionDetailsDashboard />} />
        <Route path="/launch/:id" element={<LiveLaunchDashboard />} />
        <Route path="/training" element={<TrainingResultsPage />} />
        <Route path="/launches" element={<PastLaunchesPage />} />
        <Route path="/satellites" element={<SatelliteDashboard />} />
        <Route path="/rovers" element={<div className="min-h-screen bg-black text-white p-8">Rover Management Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}

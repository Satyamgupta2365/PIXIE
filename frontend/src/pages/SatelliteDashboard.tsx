import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Satellite, Activity, Globe2, Shield, Radio, Zap, AlertTriangle, Crosshair, ChevronDown } from 'lucide-react';

interface SatelliteData {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
}

export default function SatelliteDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<SatelliteData | null>(null);
  const [error, setError] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('Monitoring orbital mechanics...');

  // Fetch real ISS data
  useEffect(() => {
    const fetchSatData = async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        setData(json);
        setError(false);
      } catch (err) {
        console.error('Failed to fetch satellite data', err);
        // Fallback simulation if API fails
        if (!data) {
          setData({
            latitude: (Math.random() * 180) - 90,
            longitude: (Math.random() * 360) - 180,
            altitude: 418.5 + (Math.random() * 2),
            velocity: 27580 + (Math.random() * 10),
            visibility: 'daylight',
            footprint: 4500,
            timestamp: Math.floor(Date.now() / 1000)
          });
        }
      }
    };

    fetchSatData();
    const interval = setInterval(fetchSatData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Simulate AI logs
  useEffect(() => {
    if (!data) return;
    const analyses = [
      `Trajectory optimal. Orbital decay negligible (-0.002 km/day).`,
      `Solar arrays aligned. Power generation at 98.4% efficiency.`,
      `Debris tracking active. No collision threats detected in 50km radius.`,
      `Cross-track error: 0.001 deg. Station-keeping thrusters in standby.`,
      `Thermal radiators operating nominally in ${data.visibility} phase.`
    ];
    const interval = setInterval(() => {
      setAiAnalysis(analyses[Math.floor(Math.random() * analyses.length)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [data]);

  const mapX = data ? ((data.longitude + 180) / 360) * 100 : 50;
  const mapY = data ? ((90 - data.latitude) / 180) * 100 : 50;

  return (
    <div className="relative min-h-screen bg-[#02050A] text-white font-sans overflow-hidden select-none">
      
      {/* Sci-Fi Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px]" />
        {/* Hex Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSI0OSIgdmlld0JveD0iMCAwIDI4IDQ5Ij48cGF0aCBkPSJNMzguNSAyNC41TDE0LjUgMTAuNWwtMjQgMTRWMzguNWwyNCAxNEwzOC41IDM4LjV2LTI4eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]" />
      </div>

      {/* Top Nav */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 w-full border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <div className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2">
            PIXEL <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono tracking-widest">ORB-NET</span>
          </div>
          <button 
            onClick={() => navigate('/operations')}
            className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Hub
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-green-400 font-mono">Live Link: ISS (ZARYA)</span>
          </div>
          <div className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs uppercase tracking-widest">
            AI Fleet Control
          </div>
        </div>
      </nav>

      <div className="relative z-20 max-w-[1600px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-100px)]">
        
        {/* Left Column: Telemetry */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="text-sm uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Telemetry
          </div>

          {[
            { label: 'Altitude', value: data?.altitude.toFixed(2) || '---', unit: 'km', icon: ArrowLeft },
            { label: 'Velocity', value: data ? Math.floor(data.velocity).toLocaleString() : '---', unit: 'km/h', icon: Zap },
            { label: 'Latitude', value: data?.latitude.toFixed(4) || '---', unit: '°', icon: Globe2 },
            { label: 'Longitude', value: data?.longitude.toFixed(4) || '---', unit: '°', icon: Globe2 }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-colors"
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500/0 group-hover:bg-blue-500/50 transition-colors" />
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono">{item.label}</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black font-mono tracking-tighter text-white">{item.value}</span>
                <span className="text-sm text-blue-400/60 font-mono mb-1">{item.unit}</span>
              </div>
            </motion.div>
          ))}

          {/* AI Status Panel */}
          <div className="mt-auto bg-blue-900/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs uppercase tracking-widest text-blue-400">PIXEL Operations Agent</span>
            </div>
            <p className="text-sm text-white/80 font-mono leading-relaxed h-16">
              &gt; {aiAnalysis}
            </p>
          </div>
        </div>

        {/* Center Column: Global Tracking Map */}
        <div className="lg:col-span-6 flex flex-col relative">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden relative flex-grow flex items-center justify-center p-8">
            
            {/* Minimalist SVG World Map Overlay */}
            <div className="absolute inset-8 border border-white/5 rounded-2xl opacity-40 mix-blend-screen" 
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 40 0 L 0 0 0 40\' fill=\'none\' stroke=\'rgba(255,255,255,0.2)\' stroke-width=\'1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")' }} 
            />

            {/* Target Reticle (The Satellite) */}
            {data && (
              <motion.div 
                className="absolute z-20 flex items-center justify-center pointer-events-none"
                animate={{ left: `${mapX}%`, top: `${mapY}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              >
                <div className="relative">
                  <Crosshair className="w-12 h-12 text-cyan-400 opacity-80" />
                  <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/60 backdrop-blur-sm border border-cyan-500/30 px-3 py-1 rounded text-[10px] font-mono text-cyan-400 whitespace-nowrap">
                    ISS (ZARYA)
                  </div>
                </div>
              </motion.div>
            )}

            {/* Simulated Equator & Meridians */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-500/30 border-b border-dashed border-cyan-500/20" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-cyan-500/30 border-r border-dashed border-cyan-500/20" />

            {/* Map Labels */}
            <div className="absolute bottom-6 left-6 text-[10px] font-mono text-white/30">LATITUDE / LONGITUDE TRACKING grid</div>
            <div className="absolute bottom-6 right-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] font-mono text-yellow-400">{data?.visibility === 'daylight' ? 'SOLAR EXPOSURE' : 'ECLIPSE PHASE'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Fleet Management & Orbital Health */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="text-sm uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4" /> Constellation Management
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 blur-[50px]" />
            <h3 className="text-xs text-white/50 uppercase tracking-widest mb-4">Active Assets</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Satellite className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-white">ISS (ZARYA)</div>
                    <div className="text-[10px] text-blue-400">Tracking Active</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 opacity-60 cursor-pointer hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <Satellite className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-xs font-bold text-white">PIXEL-SAT 1</div>
                    <div className="text-[10px] text-white/40">Geostationary</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 opacity-60 cursor-pointer hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <Satellite className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-xs font-bold text-white">PIXEL-SAT 2</div>
                    <div className="text-[10px] text-white/40">Polar Orbit</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          {/* Orbital Health Radar (Similar to the launch one) */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex-grow flex flex-col relative overflow-hidden">
            <h3 className="text-xs text-white/50 uppercase tracking-widest mb-4">Debris Radar</h3>
            
            <div className="relative w-full aspect-square mt-4 opacity-70">
               <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_10s_linear_infinite]">
                 {/* Background rings */}
                 <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                 <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                 <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                 
                 {/* Radar sweep */}
                 <path d="M 50 50 L 50 5 A 45 45 0 0 1 95 50 Z" fill="url(#radar-gradient)" className="opacity-40" />
                 
                 {/* Simulated debris blips */}
                 <circle cx="70" cy="30" r="1.5" fill="#eab308" className="animate-pulse" />
                 <circle cx="30" cy="70" r="1" fill="#eab308" className="animate-pulse" />
                 <circle cx="20" cy="40" r="2" fill="#ef4444" className="animate-pulse" />
                 
                 <defs>
                  <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
               </svg>
               {/* Center Sat icon */}
               <Satellite className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            </div>

            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] font-mono text-white/40 mb-1">
                <span>Threat Level</span>
                <span className="text-green-400">NOMINAL</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 w-1/4" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

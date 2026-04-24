import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Satellite, Activity, Globe2, Shield, Radio, Zap, AlertTriangle, Signal, Wifi, Thermometer, Battery, ChevronRight, Crosshair } from 'lucide-react';

interface SatelliteData {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
}

const satellites = [
  { id: 'iss', name: 'ISS (ZARYA)', type: 'Space Station', orbit: 'LEO', apiId: 25544 },
  { id: 'pixel1', name: 'PIXEL-SAT 1', type: 'Communications', orbit: 'GEO', apiId: null },
  { id: 'pixel2', name: 'PIXEL-SAT 2', type: 'Earth Observation', orbit: 'SSO', apiId: null },
];

const AI_LOGS = [
  'Orbital decay negligible — thrust compensation not required.',
  'Collision avoidance scan complete. Debris-free corridor confirmed.',
  'Solar array efficiency at 98.4%. Thermal baseline stable.',
  'Uplink signal at 12.3 Mb/s. Ground station handoff in T-8m.',
  'PIXEL Agent autonomously adjusting attitude for optimal solar angle.',
];

export default function SatelliteDashboard() {
  const navigate = useNavigate();
  const [selectedSat, setSelectedSat] = useState(0);
  const [data, setData] = useState<SatelliteData | null>(null);
  const [history, setHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [logIdx, setLogIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchISS = async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const json = await res.json();
        setData(json);
        setHistory(prev => [...prev.slice(-40), { lat: json.latitude, lng: json.longitude }]);
      } catch {
        // fallback sim
        setData(prev => prev ? {
          ...prev,
          latitude: prev.latitude + 0.08,
          longitude: prev.longitude + 0.5,
          altitude: 418.5 + Math.sin(tick * 0.1) * 0.5,
          velocity: 27580 + Math.random() * 20,
          timestamp: Date.now() / 1000,
        } : {
          latitude: 28.6, longitude: 77.2, altitude: 418.5,
          velocity: 27580, visibility: 'daylight', footprint: 4500, timestamp: Date.now() / 1000,
        });
      }
    };
    fetchISS();
    const interval = setInterval(() => { fetchISS(); setTick(t => t + 1); }, 2000);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    const t = setInterval(() => setLogIdx(i => (i + 1) % AI_LOGS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const mapX = data ? ((data.longitude + 180) / 360) * 100 : 50;
  const mapY = data ? ((90 - data.latitude) / 180) * 100 : 50;

  const isDaylight = data?.visibility === 'daylight';

  return (
    <div className="h-screen w-screen bg-[#080c14] text-white overflow-hidden flex flex-col">

      {/* ── NAV BAR ── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/operations')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Hub
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xl font-black tracking-tighter uppercase">PIXEL <span className="text-blue-400">Orb-Net</span></span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Data Active
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs uppercase tracking-widest">
            AI Autonomous Control
          </div>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <div className="flex-1 grid grid-cols-[300px_1fr_280px] gap-4 p-4 min-h-0">

        {/* ── LEFT: Fleet Panel ── */}
        <div className="flex flex-col gap-4">
          
          {/* Fleet Selector */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Radio className="w-3 h-3" /> Active Constellation
            </div>
            <div className="space-y-2">
              {satellites.map((sat, i) => (
                <button
                  key={sat.id}
                  onClick={() => setSelectedSat(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    selectedSat === i
                      ? 'bg-blue-500/15 border border-blue-500/40'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    selectedSat === i ? 'bg-blue-500/20' : 'bg-white/5'
                  }`}>
                    <Satellite className={`w-4 h-4 ${selectedSat === i ? 'text-blue-400' : 'text-white/40'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${selectedSat === i ? 'text-white' : 'text-white/60'}`}>{sat.name}</div>
                    <div className="text-[10px] text-white/30 font-mono">{sat.orbit} · {sat.type}</div>
                  </div>
                  <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${selectedSat === 0 && i === 0 ? 'bg-blue-400 animate-pulse' : i === 0 ? 'bg-green-400' : 'bg-green-400'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Live Telemetry Cards */}
          <div className="text-[10px] text-white/40 uppercase tracking-widest px-1 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Telemetry Feed
          </div>

          {[
            { label: 'Altitude', value: data?.altitude.toFixed(1) ?? '—', unit: 'km', icon: ArrowLeft, col: 'text-cyan-400' },
            { label: 'Velocity', value: data ? Math.floor(data.velocity).toLocaleString() : '—', unit: 'km/h', icon: Zap, col: 'text-yellow-400' },
            { label: 'Latitude', value: data?.latitude.toFixed(3) ?? '—', unit: '°', icon: Globe2, col: 'text-purple-400' },
            { label: 'Longitude', value: data?.longitude.toFixed(3) ?? '—', unit: '°', icon: Globe2, col: 'text-purple-400' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 backdrop-blur-md flex items-center justify-between group hover:border-white/20 transition-colors"
            >
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-mono">{item.label}</div>
                <div className={`text-2xl font-black font-mono tracking-tighter ${item.col}`}>{item.value}</div>
              </div>
              <div className="text-sm text-white/20 font-mono">{item.unit}</div>
            </motion.div>
          ))}

          {/* System health gauges */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md mt-auto">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4">System Health</div>
            {[
              { label: 'Power', value: 97, icon: Battery, color: 'bg-green-400' },
              { label: 'Signal', value: 84, icon: Signal, color: 'bg-blue-400' },
              { label: 'Thermal', value: 72, icon: Thermometer, color: 'bg-orange-400' },
            ].map(h => (
              <div key={h.label} className="flex items-center gap-3 mb-3">
                <h.icon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <div className="text-[10px] text-white/40 w-12 shrink-0 uppercase">{h.label}</div>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${h.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${h.value}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-[10px] font-mono text-white/40 w-8 text-right">{h.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTER: World Map ── */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md overflow-hidden relative flex-1">
            
            {/* Map Title */}
            <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Ground Track · Real-Time ISS Position</div>
            </div>

            {/* Corner HUD marks */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 rounded-tl-2xl z-10" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/40 rounded-tr-2xl z-10" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/40 rounded-bl-2xl z-10" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 rounded-br-2xl z-10" />

            {/* World Map SVG via iframe / embed */}
            <div className="absolute inset-0 opacity-30">
              <svg viewBox="0 0 1000 500" className="w-full h-full">
                {/* Grid lines */}
                {[...Array(10)].map((_, i) => (
                  <line key={`v${i}`} x1={i * 111} y1="0" x2={i * 111} y2="500" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
                ))}
                {[...Array(6)].map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 100} x2="1000" y2={i * 100} stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
                ))}
                {/* Equator */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(59,130,246,0.5)" strokeWidth="1" strokeDasharray="8 4" />
                {/* Prime meridian */}
                <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(59,130,246,0.5)" strokeWidth="1" strokeDasharray="8 4" />

                {/* Simplified continent shapes as blobs */}
                <ellipse cx="200" cy="180" rx="80" ry="90" fill="rgba(59,130,246,0.15)" />
                <ellipse cx="240" cy="320" rx="70" ry="80" fill="rgba(59,130,246,0.12)" />
                <ellipse cx="480" cy="150" rx="120" ry="80" fill="rgba(59,130,246,0.15)" />
                <ellipse cx="550" cy="280" rx="60" ry="100" fill="rgba(59,130,246,0.12)" />
                <ellipse cx="750" cy="200" rx="80" ry="70" fill="rgba(59,130,246,0.15)" />
                <ellipse cx="780" cy="320" rx="60" ry="80" fill="rgba(59,130,246,0.10)" />
                <ellipse cx="880" cy="150" rx="50" ry="60" fill="rgba(59,130,246,0.12)" />
                <ellipse cx="500" cy="430" rx="100" ry="40" fill="rgba(59,130,246,0.08)" />

                {/* Orbital ground track path */}
                {history.length > 2 && (
                  <polyline
                    points={history.map(p => `${((p.lng + 180) / 360) * 1000},${((90 - p.lat) / 180) * 500}`).join(' ')}
                    fill="none"
                    stroke="rgba(34,211,238,0.5)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}
              </svg>
            </div>

            {/* ISS Dot — absolute positioned over the map */}
            {data && (
              <motion.div
                className="absolute z-20"
                style={{ left: `${mapX}%`, top: `${mapY}%` }}
                animate={{ left: `${mapX}%`, top: `${mapY}%` }}
                transition={{ type: 'spring', stiffness: 40, damping: 20 }}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  {/* Pulse ring */}
                  <div className="absolute inset-0 w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/60 animate-ping" />
                  {/* Icon */}
                  <Satellite className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  {/* Label */}
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm border border-cyan-500/40 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-400 whitespace-nowrap">
                    {data.latitude.toFixed(2)}° / {data.longitude.toFixed(2)}°
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footprint circle */}
            {data && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/20 bg-cyan-500/5 pointer-events-none z-10"
                style={{ left: `${mapX}%`, top: `${mapY}%`, width: '160px', height: '160px' }}
              />
            )}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-[10px] font-mono text-white/40">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-cyan-400 rounded" /> Ground Track</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full border border-cyan-500/30 inline-block" /> Coverage Footprint</span>
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full border ${isDaylight ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'}`}>
                  {isDaylight ? '☀ SOLAR EXPOSURE' : '🌑 ECLIPSE PHASE'}
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Strip */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-blue-400/60 uppercase tracking-widest mb-1 font-mono">PIXEL Operations Agent · Active Analysis</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={logIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-white/80 font-mono truncate"
                >
                  &gt; {AI_LOGS[logIdx]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          </div>
        </div>

        {/* ── RIGHT: Orbital & Radar ── */}
        <div className="flex flex-col gap-4">
          
          {/* Orbital Stats */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe2 className="w-3 h-3" /> Orbital Parameters
            </div>
            <div className="space-y-3">
              {[
                { label: 'Orbit Type', value: 'LEO' },
                { label: 'Period', value: '92.5 min' },
                { label: 'Inclination', value: '51.6°' },
                { label: 'Footprint', value: `${data?.footprint ?? 4500} km` },
                { label: 'NORAD ID', value: '25544' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] text-white/40 uppercase font-mono">{item.label}</span>
                  <span className="text-xs font-mono text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Debris Radar */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md flex-1 flex flex-col">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Crosshair className="w-3 h-3" /> Proximity Radar
            </div>

            <div className="relative flex-1 flex items-center justify-center min-h-0">
              <svg viewBox="0 0 100 100" className="w-full max-w-[180px] aspect-square">
                {/* Rings */}
                {[45, 32, 19, 8].map((r, i) => (
                  <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5" />
                ))}
                {/* Cross hairs */}
                <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
                
                {/* Radar sweep */}
                <motion.g
                  style={{ transformOrigin: '50px 50px' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <path d="M 50 50 L 50 5 A 45 45 0 0 1 92 68 Z" fill="url(#sweep-grad)" opacity="0.4" />
                </motion.g>

                {/* Center sat */}
                <circle cx="50" cy="50" r="2" fill="#38bdf8" />
                <circle cx="50" cy="50" r="4" fill="none" stroke="#38bdf8" strokeWidth="0.5" />

                {/* Debris blips */}
                <circle cx="72" cy="28" r="1.5" fill="#eab308" opacity="0.8" />
                <circle cx="28" cy="65" r="1" fill="#22c55e" opacity="0.8" />
                <circle cx="80" cy="60" r="1.2" fill="#22c55e" opacity="0.8" />

                <defs>
                  <radialGradient id="sweep-grad" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Threat Legend */}
            <div className="mt-4 space-y-2">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Detected Objects</div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Class A Debris</div>
                <span className="text-green-400">2 objects</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Conjunction Risk</div>
                <span className="text-yellow-400">1 object</span>
              </div>
              <div className="mt-3 flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-[10px] text-green-400 uppercase font-mono">Threat Level</span>
                <span className="text-[10px] text-green-400 font-bold font-mono">NOMINAL</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

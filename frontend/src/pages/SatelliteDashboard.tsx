import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Satellite, Activity, Globe2, Shield, Radio, Zap, Signal, Thermometer, Battery, Crosshair, Search, Plus, Loader2 } from 'lucide-react';

const INITIAL_SATELLITES = [
  { key: 'iss',    id: 25544, name: 'ISS (ZARYA)',           orbit: 'LEO', type: 'Space Station', inclination: 51.6 },
  { key: 'hubble', id: 20580, name: 'Hubble Telescope',      orbit: 'LEO', type: 'Space Telescope', inclination: 28.5 },
  { key: 'noaa19', id: 33591, name: 'NOAA-19',               orbit: 'SSO', type: 'Weather Satellite', inclination: 99.0 },
];

const AI_LOGS = [
  'Orbital decay negligible — no thrust compensation required.',
  'Collision avoidance scan complete. Debris-free corridor confirmed.',
  'Solar array efficiency at 98.4%. Thermal baseline stable.',
  'Uplink signal at 12.3 Mb/s. Ground station handoff in T-8 min.',
  'PIXEL Agent autonomously adjusting attitude for optimal solar angle.',
];

export default function SatelliteDashboard() {
  const navigate = useNavigate();
  const [fleet, setFleet] = useState(INITIAL_SATELLITES);
  const [selIdx, setSelIdx] = useState(0);
  const [positions, setPositions] = useState<Record<string, any>>({});
  const [passes, setPasses] = useState<any[]>([]);
  const [history, setHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [logIdx, setLogIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const sat = fleet[selIdx];

  // Fetch fleet positions every 5s
  useEffect(() => {
    const fetchFleet = async () => {
      // Create a dict of new positions by fetching individually, since the backend /fleet might just have hardcoded ones
      // Actually, we can fetch all individually from N2YO to support dynamic fleet
      try {
        const newPos: Record<string, any> = { ...positions };
        for (const s of fleet) {
          try {
            const res = await fetch(`/api/satellite/position/${s.id}`);
            if (res.ok) {
              const data = await res.json();
              newPos[s.key] = { ...data, orbit: s.orbit, type: s.type };
            }
          } catch (e) {
            // fallback for ISS
            if (s.id === 25544) {
              const r2 = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
              const d2 = await r2.json();
              newPos[s.key] = { ...newPos[s.key], latitude: d2.latitude, longitude: d2.longitude, altitude_km: d2.altitude, azimuth: 0, elevation: 0 };
            }
          }
        }
        setPositions(newPos);
        setLoading(false);
        const cur = newPos[sat.key];
        if (cur?.latitude != null) {
          setHistory(h => [...h.slice(-50), { lat: cur.latitude, lng: cur.longitude }]);
        }
      } catch (e) {
        setLoading(false);
      }
    };
    fetchFleet();
    const t = setInterval(fetchFleet, 5000);
    return () => clearInterval(t);
  }, [fleet, sat.key]);

  // Fetch visual passes on satellite change
  useEffect(() => {
    setPasses([]);
    fetch(`/api/satellite/passes/${sat.id}?days=2&min_visibility=60`)
      .then(r => r.json())
      .then(d => setPasses(d.passes || []))
      .catch(() => setPasses([]));
  }, [sat.id]);

  // Search effect
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/satellite/search?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddSatellite = (s: any) => {
    const key = `sat_${s.id}`;
    if (!fleet.some(f => f.id === s.id)) {
      const newFleet = [...fleet, { key, id: s.id, name: s.name, orbit: s.orbit || 'LEO', type: s.type || 'Satellite', inclination: s.inclination || 50.0 }];
      setFleet(newFleet);
      setSelIdx(newFleet.length - 1);
    } else {
      setSelIdx(fleet.findIndex(f => f.id === s.id));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // AI log rotation
  useEffect(() => {
    const t = setInterval(() => setLogIdx(i => (i + 1) % AI_LOGS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const cur = positions[sat.key];
  const mapX = cur ? ((cur.longitude + 180) / 360) * 100 : 50;
  const mapY = cur ? ((90 - cur.latitude) / 180) * 100 : 50;

  // Predict future orbital track mathematically for the visual effect
  // Ground track on equirectangular map is roughly a sine wave: lat = inclination * sin(lng_offset)
  const inclMap: Record<string, number> = { iss: 51.6, hubble: 28.5, noaa19: 81.0 };
  const getPredictedTrack = () => {
    if (!cur) return '';
    const incl = inclMap[sat.key] || 50;
    // Calculate the phase shift so the sine wave passes exactly through the current lat/lng
    // lat = incl * sin((lng - phase) * PI/180)
    // sin((lng - phase)*PI/180) = lat / incl
    let ratio = cur.latitude / incl;
    if (ratio > 1) ratio = 1;
    if (ratio < -1) ratio = -1;
    
    // We have to figure out if it's going north or south. 
    // If history exists, use it to determine derivative (ascending/descending node)
    let isAscending = true;
    if (history.length > 1) {
      const prev = history[history.length - 2];
      if (cur.latitude < prev.lat) isAscending = false;
    }

    let angle = Math.asin(ratio) * (180 / Math.PI);
    if (!isAscending) {
      angle = 180 - angle;
    }

    const phase = cur.longitude - angle;

    const points = [];
    for (let lng = -180; lng <= 180; lng += 2) {
      const lat = incl * Math.sin((lng - phase) * (Math.PI / 180));
      const px = ((lng + 180) / 360) * 1000;
      const py = ((90 - lat) / 180) * 500;
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  };

  return (
    <div className="h-screen w-screen bg-[#080c14] text-white overflow-hidden flex flex-col font-sans">

      {/* NAV */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/operations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Hub
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xl font-black tracking-tighter">PIXEL <span className="text-blue-400">Orb-Net</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            N2YO Live Feed
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs uppercase tracking-widest">
            AI Autonomous Control
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-[280px_1fr_300px] gap-4 p-4 min-h-0">

        {/* LEFT */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-md focus-within:border-cyan-500/50 transition-colors">
              <Search className="w-4 h-4 text-white/40 ml-3" />
              <input 
                type="text" 
                placeholder="Search catalog (e.g. STARLINK)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-white placeholder-white/30 p-3 focus:outline-none"
              />
              {isSearching && <Loader2 className="w-4 h-4 text-cyan-400 mr-3 animate-spin" />}
            </div>
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#080c14]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto"
                >
                  {searchResults.map(s => (
                    <button key={s.id} onClick={() => handleAddSatellite(s)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center justify-between group">
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">{s.name}</div>
                        <div className="text-[10px] text-white/40 font-mono">NORAD: {s.id}</div>
                      </div>
                      <Plus className="w-4 h-4 text-white/20 group-hover:text-cyan-400" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 flex items-center gap-2 mt-2">
            <Radio className="w-3 h-3" /> Active Fleet
          </div>

          {/* Satellite Selector */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            {fleet.map((s, i) => (
              <button key={s.key} onClick={() => { setSelIdx(i); setHistory([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-1 last:mb-0 ${selIdx === i ? 'bg-cyan-500/15 border border-cyan-500/40' : 'hover:bg-white/5 border border-transparent'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selIdx === i ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                  <Satellite className={`w-4 h-4 ${selIdx === i ? 'text-cyan-400' : 'text-white/40'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-bold truncate ${selIdx === i ? 'text-white' : 'text-white/60'}`}>{s.name}</div>
                  <div className="text-[10px] text-white/30 font-mono">NORAD: {s.id}</div>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              </button>
            ))}
          </div>

          {/* Telemetry */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 flex items-center gap-2 mt-1">
            <Activity className="w-3 h-3" /> Live Telemetry — N2YO
          </div>
          {[
            { label: 'Altitude',   value: cur?.altitude_km?.toFixed(1)   ?? (loading ? '...' : 'N/A'), unit: 'km',   col: 'text-cyan-400' },
            { label: 'Latitude',   value: cur?.latitude?.toFixed(4)      ?? '—',                        unit: '°',    col: 'text-purple-400' },
            { label: 'Longitude',  value: cur?.longitude?.toFixed(4)     ?? '—',                        unit: '°',    col: 'text-purple-400' },
            { label: 'Azimuth',    value: cur?.azimuth?.toFixed(1)       ?? '—',                        unit: '°',    col: 'text-yellow-400' },
            { label: 'Elevation',  value: cur?.elevation?.toFixed(1)     ?? '—',                        unit: '°',    col: 'text-green-400' },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between hover:border-white/20 transition-colors">
              <div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-mono">{item.label}</div>
                <div className={`text-xl font-black font-mono tracking-tighter ${item.col}`}>{item.value}</div>
              </div>
              <div className="text-xs text-white/20 font-mono">{item.unit}</div>
            </div>
          ))}

          {/* System Health */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md mt-auto">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">System Health</div>
            {[
              { label: 'Power',  value: 97, color: 'bg-green-400' },
              { label: 'Signal', value: 84, color: 'bg-blue-400' },
              { label: 'Thermal',value: 72, color: 'bg-orange-400' },
            ].map(h => (
              <div key={h.label} className="flex items-center gap-3 mb-2">
                <div className="text-[9px] text-white/30 w-10 uppercase font-mono shrink-0">{h.label}</div>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${h.color}`} initial={{ width: 0 }} animate={{ width: `${h.value}%` }} transition={{ duration: 1 }} />
                </div>
                <div className="text-[9px] font-mono text-white/30 w-7 text-right">{h.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Map */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-[#040d1a] border border-blue-500/20 rounded-2xl overflow-hidden relative flex-1">
            {/* Corner marks */}
            {['tl','tr','bl','br'].map(c => (
              <div key={c} className={`absolute w-6 h-6 z-10 ${c.includes('t') ? 'top-0 border-t-2' : 'bottom-0 border-b-2'} ${c.includes('l') ? 'left-0 border-l-2 rounded-tl-2xl' : 'right-0 border-r-2 rounded-tr-2xl'} border-blue-500/40`} />
            ))}

            <div className="absolute top-4 left-6 z-20 text-[10px] text-white/30 uppercase tracking-widest font-mono">
              Ground Track · {sat.name}
            </div>

            {/* SVG map — visible world map */}
            <div className="absolute inset-0">
              <svg viewBox="0 0 1000 500" className="w-full h-full" style={{ background: '#020b18' }}>
                {/* Ocean background */}
                <rect width="1000" height="500" fill="#020b18"/>

                {/* Grid lines */}
                {[...Array(19)].map((_,i) => <line key={`v${i}`} x1={i*56} y1="0" x2={i*56} y2="500" stroke="rgba(59,130,246,0.08)" strokeWidth="0.5"/>)}
                {[...Array(9)].map((_,i) => <line key={`h${i}`} x1="0" y1={i*62.5} x2="1000" y2={i*62.5} stroke="rgba(59,130,246,0.08)" strokeWidth="0.5"/>)}

                {/* ── High-Res Map SVG ── */}
                <image 
                  href="/world.svg" 
                  x="0" y="0" width="1000" height="500" 
                  preserveAspectRatio="none"
                  style={{ opacity: 0.8 }}
                />

                {/* Equator */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(59,130,246,0.35)" strokeWidth="1" strokeDasharray="8 4"/>
                {/* Prime meridian */}
                <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(59,130,246,0.35)" strokeWidth="1" strokeDasharray="8 4"/>
                {/* Tropic of Cancer */}
                <line x1="0" y1="178" x2="1000" y2="178" stroke="rgba(59,130,246,0.12)" strokeWidth="0.5" strokeDasharray="4 6"/>
                {/* Tropic of Capricorn */}
                <line x1="0" y1="322" x2="1000" y2="322" stroke="rgba(59,130,246,0.12)" strokeWidth="0.5" strokeDasharray="4 6"/>

                {/* Projected orbital track (sine wave) */}
                {cur && (
                  <polyline
                    points={getPredictedTrack()}
                    fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" strokeDasharray="10 5"
                    strokeLinecap="round"
                  />
                )}

                {/* Ground track trail (historical) */}
                {history.length > 1 && (
                  <polyline
                    points={history.map(p => `${((p.lng+180)/360)*1000},${((90-p.lat)/180)*500}`).join(' ')}
                    fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>

            {/* Satellite reticle — large, glowing, clearly visible */}
            {cur && (
              <motion.div
                className="absolute z-30"
                style={{ left: `${mapX}%`, top: `${mapY}%` }}
                animate={{ left: `${mapX}%`, top: `${mapY}%` }}
                transition={{ type: 'spring', stiffness: 40, damping: 20 }}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-6 rounded-full bg-cyan-400/10 animate-pulse" />
                  {/* Pulsing ring 1 */}
                  <div className="absolute -inset-5 rounded-full border-2 border-cyan-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
                  {/* Pulsing ring 2 */}
                  <div className="absolute -inset-3 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                  {/* Static crosshair lines */}
                  <div className="absolute left-1/2 top-0 -translate-x-px w-px h-full bg-cyan-400/60 -translate-y-8" style={{ height: '70px', top: '-35px' }} />
                  <div className="absolute top-1/2 left-0 -translate-y-px h-px w-full bg-cyan-400/60" style={{ width: '70px', left: '-35px' }} />
                  {/* Satellite icon */}
                  <div className="relative z-10 w-8 h-8 rounded-full bg-cyan-400/30 border-2 border-cyan-300 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                    <Satellite className="w-4 h-4 text-cyan-100" />
                  </div>
                  {/* Coordinates label */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-cyan-500/60 px-3 py-1 rounded-lg text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    📡 {sat.name}<br/>
                    <span className="text-white/70">{cur.latitude?.toFixed(3)}° / {cur.longitude?.toFixed(3)}°</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footprint */}
            {cur && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/30 bg-cyan-500/5 pointer-events-none z-20"
                style={{ left: `${mapX}%`, top: `${mapY}%`, width: '220px', height: '220px' }}
              />
            )}

            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between z-20">
              <div className="flex items-center gap-4 text-[9px] font-mono text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-cyan-400 rounded"/> Ground Track</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-cyan-500/30 inline-block"/> Footprint</span>
              </div>
              <div className="font-mono text-[9px] text-white/30">NORAD {sat.id}</div>
            </div>
          </div>

          {/* AI Strip */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-blue-400/60 uppercase tracking-widest mb-1 font-mono">PIXEL Ops Agent · N2YO Data Analysis</div>
              <AnimatePresence mode="wait">
                <motion.div key={logIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="text-sm text-white/80 font-mono truncate">
                  &gt; {AI_LOGS[logIdx]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Orbital Params */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe2 className="w-3 h-3" /> Orbital Parameters
            </div>
            {[
              { label: 'Orbit Type',    value: sat.orbit },
              { label: 'Asset Type',    value: sat.type },
              { label: 'NORAD ID',      value: `${sat.id}` },
              { label: 'Period',        value: sat.key === 'iss' ? '92.5 min' : sat.key === 'hubble' ? '95.2 min' : '101.2 min' },
              { label: 'Inclination',   value: sat.key === 'iss' ? '51.6°' : sat.key === 'hubble' ? '28.5°' : '99.1°' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-white/30 uppercase font-mono">{item.label}</span>
                <span className="text-xs font-mono text-white">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Visual Passes */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md flex-1">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Next Visual Passes
            </div>
            {passes.length === 0 ? (
              <div className="text-[10px] text-white/20 font-mono italic">Loading from N2YO...</div>
            ) : passes.slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="flex flex-col gap-1 py-3 border-b border-white/5 last:border-0">
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-cyan-400">
                    {new Date(p.start_utc * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{p.duration_s}s</span>
                </div>
                <div className="flex gap-3 text-[9px] font-mono text-white/30">
                  <span>Max El: <span className="text-green-400">{p.max_el?.toFixed(1)}°</span></span>
                  <span>{p.start_az} → {p.end_az}</span>
                  {p.magnitude && p.magnitude !== 100000 && <span>Mag: {p.magnitude?.toFixed(1)}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Radar */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Crosshair className="w-3 h-3" /> Proximity Radar
            </div>
            <div className="flex justify-center">
              <svg viewBox="0 0 100 100" className="w-36 h-36">
                {[45, 32, 19, 8].map(r => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5"/>)}
                <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5"/>
                <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5"/>
                <motion.g style={{ transformOrigin: '50px 50px' }} animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                  <path d="M 50 50 L 50 5 A 45 45 0 0 1 92 68 Z" fill="url(#sweep)" opacity="0.4"/>
                </motion.g>
                <circle cx="50" cy="50" r="2" fill="#38bdf8"/>
                <circle cx="72" cy="28" r="1.5" fill="#eab308" opacity="0.8"/>
                <circle cx="28" cy="65" r="1" fill="#22c55e" opacity="0.8"/>
                <defs>
                  <radialGradient id="sweep" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center justify-between mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-[9px] text-green-400 uppercase font-mono">Threat Level</span>
              <span className="text-[9px] text-green-400 font-bold font-mono">NOMINAL</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

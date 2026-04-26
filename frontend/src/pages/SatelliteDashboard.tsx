import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Satellite, Activity, Globe2, Shield, Radio, Zap, Signal, Thermometer, Battery, Crosshair, Search, Plus, Loader2, X, AlertTriangle, Clock, Bell } from 'lucide-react';
import { COLLISION_HISTORY } from '@/data/collisionHistory';

const RECENT_ALERTS = [
  { id: 'alert-1', time: '2h ago', level: 'WARNING', satA: 'STARLINK-3127', satB: 'CZ-6A DEB', miss: '890 m', pc: '0.034', deltaV: '0.2 m/s', reward: '+2.1', action: 'PIXIE RL: Executed 0.2 m/s prograde burn on STARLINK-3127. Miss distance improved to 8.4 km. Conjunction resolved.', resolved: true },
  { id: 'alert-2', time: '5h ago', level: 'CRITICAL', satA: 'SENTINEL-6A', satB: 'FENGYUN DEB #4891', miss: '340 m', pc: '0.12', deltaV: '0.5 m/s', reward: '+3.4', action: 'PIXIE RL: Emergency retrograde burn commanded. Collision probability reduced from 0.12 to <0.0001. Asset preserved.', resolved: true },
  { id: 'alert-3', time: '8h ago', level: 'CAUTION', satA: 'IRIDIUM-142', satB: 'COSMOS DEB #19221', miss: '2.1 km', pc: '0.003', deltaV: '0.05 m/s', reward: '+0.8', action: 'PIXIE RL: Monitoring only. Miss distance within acceptable bounds. No maneuver required. Tracking continued.', resolved: true },
  { id: 'alert-4', time: '14h ago', level: 'WARNING', satA: 'ISS (ZARYA)', satB: 'SL-16 R/B', miss: '1.2 km', pc: '0.008', deltaV: '0.15 m/s', reward: '+2.6', action: 'PIXIE RL: Pre-planned avoidance merged with routine ISS reboost. Zero additional fuel cost. Crew schedule unaffected.', resolved: true },
  { id: 'alert-5', time: '19h ago', level: 'CRITICAL', satA: 'TERRA (EOS AM-1)', satB: 'BREEZE-M DEB', miss: '180 m', pc: '0.31', deltaV: '0.7 m/s', reward: '+3.8', action: 'PIXIE RL: High-priority conjunction. Autonomous burn executed at T-4h. Post-maneuver TLE confirms 15 km separation. Kessler event prevented.', resolved: true },
  { id: 'alert-6', time: '22h ago', level: 'CAUTION', satA: 'JASON-3', satB: 'ARIANE DEB #22874', miss: '3.4 km', pc: '0.001', deltaV: '0.03 m/s', reward: '+0.5', action: 'PIXIE RL: Low-risk conjunction. Added to watch list. Subsequent TLE updates show increasing miss distance. No action needed.', resolved: true },
];

const RL_SATELLITES = [
  { key: 'sat-a', id: 'SAT-A', name: 'SAT-A (Comm)', orbit: 'GEO', type: 'Communication', inclination: 0.0, lat: 0, lng: -45, battery: 75, bandwidth: 50 },
  { key: 'sat-b', id: 'SAT-B', name: 'SAT-B (Imaging)', orbit: 'LEO', type: 'Imaging', inclination: 51.6, lat: 20, lng: 120, battery: 40, bandwidth: 120 },
  { key: 'sat-c', id: 'SAT-C', name: 'SAT-C (Relay)', orbit: 'MEO', type: 'Relay', inclination: 45.0, lat: -40, lng: 10, battery: 90, bandwidth: 0 },
];

const AI_LOGS = [
  'SAT-B: Data buffer full. Requesting transmission window...',
  'SAT-A: Bandwidth limited. Delaying SAT-B transmission.',
  'PIXIE Decision: Routing SAT-B data via SAT-C (Relay).',
  'SAT-C: Receiving data from SAT-B. Battery dropping to 85%.',
  'SAT-A: Transmission to Earth successful. Reward +1.0',
];

export default function SatelliteDashboard() {
  const navigate = useNavigate();
  const [fleet, setFleet] = useState<any[]>(RL_SATELLITES);
  const [selIdx, setSelIdx] = useState(0);
  const [passes, setPasses] = useState<any[]>([]);
  const [logIdx, setLogIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCollision, setSelectedCollision] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(false);

  const sat = fleet[selIdx];

  // Helper: Haversine-like distance in degrees between two lat/lng points
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = lat1 - lat2;
    let dLng = lng1 - lng2;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  // RL maneuver recommendations based on distance
  const getRLRecommendation = (dist: number, satA: any, satB: any) => {
    if (dist < 5) return {
      level: 'CRITICAL',
      color: 'red',
      action: `EMERGENCY BURN: ${satA.name} execute 0.8 m/s retrograde immediately`,
      deltaV: '0.8 m/s',
      fuel: '45g',
      reward: '+3.2',
      pc: '0.87',
      missDistance: `${(dist * 111).toFixed(0)} km`,
      newMiss: '12.4 km',
    };
    if (dist < 10) return {
      level: 'WARNING',
      color: 'orange',
      action: `AVOIDANCE MANEUVER: ${satA.name} posigrade adjustment recommended at next apogee`,
      deltaV: '0.3 m/s',
      fuel: '12g',
      reward: '+2.1',
      pc: '0.23',
      missDistance: `${(dist * 111).toFixed(0)} km`,
      newMiss: '8.7 km',
    };
    return {
      level: 'CAUTION',
      color: 'yellow',
      action: `MONITORING: Tracking conjunction between ${satA.name} and ${satB.name}`,
      deltaV: '0.05 m/s',
      fuel: '2g',
      reward: '+0.8',
      pc: '0.004',
      missDistance: `${(dist * 111).toFixed(0)} km`,
      newMiss: '25+ km',
    };
  };

  // Real-time collision detection
  useEffect(() => {
    const ALERT_THRESHOLD = 18; // degrees (~2000km)
    const newAlerts: any[] = [];
    for (let i = 0; i < fleet.length; i++) {
      for (let j = i + 1; j < fleet.length; j++) {
        const a = fleet[i], b = fleet[j];
        if (a.lat == null || b.lat == null) continue;
        const dist = getDistance(a.lat, a.lng, b.lat, b.lng);
        if (dist < ALERT_THRESHOLD) {
          const alertId = `${a.id}-${b.id}`;
          if (!dismissedAlerts.has(alertId)) {
            const rl = getRLRecommendation(dist, a, b);
            newAlerts.push({ id: alertId, satA: a, satB: b, distance: dist, ...rl, timestamp: new Date().toLocaleTimeString() });
          }
        }
      }
    }
    setActiveAlerts(newAlerts);
  }, [fleet, dismissedAlerts]);

  // Simulate RL network orbital movement
  useEffect(() => {
    const t = setInterval(() => {
      setFleet(prev => prev.map(s => {
        let newLng = s.lng + (s.orbit === 'LEO' ? 3 : s.orbit === 'MEO' ? 1.5 : 0.5);
        if (newLng > 180) newLng -= 360;
        
        let newLat = s.lat;
        if (s.orbit !== 'GEO') {
           newLat = s.inclination * Math.sin(newLng * Math.PI / 180);
        }

        // Simulate battery fluctuations
        const newBat = Math.max(0, Math.min(100, s.battery + (Math.random() * 2 - 1)));

        return { ...s, lat: newLat, lng: newLng, battery: newBat };
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

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

  const getPredictedTrack = () => {
    if (!sat || sat.lat == null) return '';
    const incl = sat.inclination || 50;
    
    const points = [];
    for (let lng = -180; lng <= 180; lng += 2) {
      let lat = sat.lat;
      if (sat.orbit !== 'GEO') {
        lat = incl * Math.sin(lng * Math.PI / 180);
      }
      const px = ((lng + 180) / 360) * 1000;
      const py = ((90 - lat) / 180) * 500;
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  };

  return (
    <div className="h-screen w-screen bg-[#080c14] text-white overflow-hidden flex flex-col font-sans">

      {/* NAV */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl shrink-0 relative z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/operations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Hub
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xl font-black tracking-tighter">PIXIE <span className="text-blue-400">Orb-Net</span></span>
        </div>
        <div className="flex items-center gap-4">
          {/* ALERTS BUTTON */}
          <div className="relative">
            <button 
              onClick={() => { setShowAlerts(!showAlerts); setShowHistory(false); }}
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-mono uppercase tracking-widest cursor-pointer ${showAlerts ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}
            >
              <Bell className="w-3 h-3" />
              Alerts
              {(activeAlerts.length + RECENT_ALERTS.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                  {activeAlerts.length + RECENT_ALERTS.length}
                </span>
              )}
            </button>

            {/* ALERTS DROPDOWN */}
            <AnimatePresence>
              {showAlerts && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-[440px] bg-[#080c14]/98 backdrop-blur-2xl border border-red-500/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">Conjunction Alerts — 24h</span>
                    </div>
                    <button onClick={() => setShowAlerts(false)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto">
                    {/* Live real-time alerts */}
                    {activeAlerts.length > 0 && (
                      <div className="px-4 pt-3 pb-1">
                        <div className="text-[9px] text-red-400 uppercase tracking-widest font-mono font-bold flex items-center gap-2 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live Detections
                        </div>
                        {activeAlerts.map(alert => (
                          <div key={alert.id} className={`p-3 rounded-xl border mb-2 ${
                            alert.level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' :
                            alert.level === 'WARNING' ? 'bg-orange-500/10 border-orange-500/30' :
                            'bg-yellow-500/10 border-yellow-500/30'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono font-bold text-white">{alert.satA.name} ↔ {alert.satB.name}</span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                alert.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                alert.level === 'WARNING' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>{alert.level}</span>
                            </div>
                            <div className="flex gap-3 text-[9px] font-mono text-white/40 mb-1">
                              <span>Miss: <span className="text-white font-bold">{alert.missDistance}</span></span>
                              <span>Pc: <span className="text-red-400">{alert.pc}</span></span>
                              <span>ΔV: <span className="text-cyan-400">{alert.deltaV}</span></span>
                              <span>R: <span className="text-green-400">{alert.reward}</span></span>
                            </div>
                            <div className="text-[9px] text-blue-300/60 font-mono">→ {alert.action}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pre-loaded 24h alerts */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="text-[9px] text-white/30 uppercase tracking-widest font-mono font-bold flex items-center gap-2 mb-2">
                        <Clock className="w-3 h-3" /> Last 24 Hours
                      </div>
                      {RECENT_ALERTS.map(alert => (
                        <div key={alert.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/15 transition-colors mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold text-white">{alert.satA} ↔ {alert.satB}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                alert.level === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                                alert.level === 'WARNING' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'
                              }`}>{alert.level}</span>
                              <span className="text-[9px] text-white/20 font-mono">{alert.time}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[9px] font-mono text-white/40 mb-1">
                            <span>Miss: <span className="text-white">{alert.miss}</span></span>
                            <span>Pc: <span className="text-red-400">{alert.pc}</span></span>
                            <span>ΔV: <span className="text-cyan-400">{alert.deltaV}</span></span>
                            <span>R: <span className="text-green-400">{alert.reward}</span></span>
                          </div>
                          <div className="text-[9px] text-blue-300/50 font-mono">{alert.action}</div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span className="text-[8px] text-green-400/70 font-mono uppercase">Resolved by PIXIE RL</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => { setShowHistory(!showHistory); setShowAlerts(false); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-mono uppercase tracking-widest cursor-pointer ${showHistory ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {showHistory ? 'Close History' : 'Collision History'}
          </button>
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

          <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 flex items-center gap-2 mt-2 shrink-0">
            <Radio className="w-3 h-3" /> Active Fleet ({fleet.length})
          </div>

          {/* Satellite Selector */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md overflow-y-auto flex-1 min-h-[300px]">
            {fleet.map((s, i) => (
              <button key={`${s.id}-${i}`} onClick={() => setSelIdx(i)}
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
            <Activity className="w-3 h-3" /> Live Telemetry — PIXIE RL
          </div>
          {[
            { label: 'Altitude',   value: sat.orbit === 'LEO' ? '400' : sat.orbit === 'MEO' ? '20,000' : '35,786', unit: 'km', col: 'text-cyan-400' },
            { label: 'Latitude',   value: sat.lat?.toFixed(4) ?? '—', unit: '°', col: 'text-purple-400' },
            { label: 'Longitude',  value: sat.lng?.toFixed(4) ?? '—', unit: '°', col: 'text-purple-400' },
            { label: 'Battery',    value: sat.battery?.toFixed(1) ?? '—', unit: '%', col: 'text-green-400' },
            { label: 'Bandwidth',  value: sat.bandwidth ?? '—', unit: 'Mb/s', col: 'text-yellow-400' },
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
                <polyline
                  points={getPredictedTrack()}
                  fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" strokeDasharray="10 5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Render all satellites simultaneously */}
            {fleet.map((s, i) => {
              const mapX = ((s.lng + 180) / 360) * 100;
              const mapY = ((90 - s.lat) / 180) * 100;
              const isSelected = selIdx === i;

              return (
                <motion.div
                  key={s.id}
                  className={`absolute z-30 ${isSelected ? '' : 'opacity-50 scale-75'}`}
                  style={{ left: `${mapX}%`, top: `${mapY}%` }}
                  animate={{ left: `${mapX}%`, top: `${mapY}%` }}
                  transition={{ type: 'spring', stiffness: 40, damping: 20 }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-1/2">
                    {/* Outer glow ring */}
                    {isSelected && <div className="absolute -inset-6 rounded-full bg-cyan-400/10 animate-pulse" />}
                    <div className="absolute -inset-5 rounded-full border-2 border-cyan-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="absolute -inset-3 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                    
                    {isSelected && (
                      <>
                        <div className="absolute left-1/2 top-0 -translate-x-px w-px h-full bg-cyan-400/60 -translate-y-8" style={{ height: '70px', top: '-35px' }} />
                        <div className="absolute top-1/2 left-0 -translate-y-px h-px w-full bg-cyan-400/60" style={{ width: '70px', left: '-35px' }} />
                      </>
                    )}
                    
                    <div className={`relative z-10 w-8 h-8 rounded-full ${isSelected ? 'bg-cyan-400/30 border-cyan-300' : 'bg-blue-500/20 border-blue-500/50'} border-2 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.8)]`}>
                      <Satellite className={`w-4 h-4 ${isSelected ? 'text-cyan-100' : 'text-blue-300'}`} />
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-cyan-500/60 px-3 py-1 rounded-lg text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                        📡 {s.name}<br/>
                        <span className="text-white/70">{s.lat?.toFixed(3)}° / {s.lng?.toFixed(3)}°</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Footprint of selected satellite */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/30 bg-cyan-500/5 pointer-events-none z-20"
              style={{ width: '220px', height: '220px' }}
              animate={{ left: `${((sat.lng + 180) / 360) * 100}%`, top: `${((90 - sat.lat) / 180) * 100}%` }}
              transition={{ type: 'spring', stiffness: 40, damping: 20 }}
            />

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
              <div className="text-[9px] text-blue-400/60 uppercase tracking-widest mb-1 font-mono">PIXIE Ops Agent · RL Network Analysis</div>
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

      {/* ── COLLISION HISTORY OVERLAY ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-screen w-[480px] bg-[#080c14]/98 backdrop-blur-2xl border-l border-red-500/20 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold uppercase tracking-widest">Collision History</span>
              </div>
              <button onClick={() => { setShowHistory(false); setSelectedCollision(null); }} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {COLLISION_HISTORY.map(c => (
                <motion.button
                  key={c.id}
                  onClick={() => navigate(`/collision/${c.id}`)}
                  className="w-full text-left p-4 rounded-xl border bg-white/[0.03] border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all group"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">{c.title}</div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0 ml-2 ${c.severity === 'CATASTROPHIC' ? 'bg-red-500/10 border-red-500/30 text-red-400' : c.severity === 'HIGH' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : c.severity === 'NEAR-MISS' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>{c.severity}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono mb-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.date}</span>
                    <span>{c.altitude}</span>
                    <span>{c.debris} debris</span>
                  </div>
                  <div className="text-[10px] text-white/50 leading-relaxed mb-3">{c.desc}</div>
                  <div className="flex items-center gap-2 text-[9px] text-blue-400/60 group-hover:text-blue-400 transition-colors font-mono uppercase tracking-widest">
                    <Shield className="w-3 h-3" /> View Full Analysis →
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

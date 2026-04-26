import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Cpu, Battery, Thermometer, Navigation, Activity, Shield, Zap, Radio, MapPin, Clock, AlertTriangle, Brain, Target, Network } from 'lucide-react';
import SpaceBackground from '@/components/ui/space-background';

const ROVERS = [
  { 
    id: 'mars', 
    name: 'PIXIE Mars', 
    type: 'Deep Autonomy', 
    color: '#f97316', 
    sol: 1820, 
    location: 'Jezero Crater', 
    battery: 45, 
    temp: -85, 
    status: 'Safe Mode',
    commDelay: '14 min',
    hazard: 'Dust Storm Active',
    logs: [
      { time: 'T-14m', type: 'cmd',     text: 'EARTH CMD RECEIVED: [drill_waypoint_7]' },
      { time: 'T-0m',  type: 'hazard',  text: '⚠ HAZARD: Severe dust storm detected. Solar eff 0%.' },
      { time: 'T+1s',  type: 'reject',  text: '🛑 RL OVERRIDE: Rejecting Earth command.' },
      { time: 'T+2s',  type: 'action',  text: '✓ RL DECISION: Executing [safe_mode]. Conserving battery.' },
      { time: 'T+3s',  type: 'reward',  text: 'Reward: +0.5 (Autonomy Survival Bonus)' }
    ],
    metrics: { reward: '1,245.8', confidence: '99.1', steps: '4.2M' }
  },
  { 
    id: 'moon', 
    name: 'PIXIE Moon', 
    type: 'Short-Horizon', 
    color: '#3b82f6', 
    sol: 14, 
    location: 'Lunar South Pole', 
    battery: 92, 
    temp: -20, 
    status: 'Sampling',
    commDelay: '1.2s',
    hazard: 'Sunset in 2 hours',
    logs: [
      { time: 'T-1.2s', type: 'cmd',    text: 'EARTH CMD RECEIVED: [soil_sample]' },
      { time: 'T-0m',   type: 'action', text: '✓ RL DECISION: Executing immediately (Latency: 1.2s)' },
      { time: 'T+2s',   type: 'reward', text: 'Reward: +0.2 (Speed Bonus during daylight)' },
      { time: 'T+5s',   type: 'hazard', text: '⚠ WARNING: Lunar sunset approaching. Temp dropping.' },
      { time: 'T+6s',   type: 'action', text: 'PLANNING: Scheduling hibernation in 3 steps.' }
    ],
    metrics: { reward: '847.3', confidence: '94.2', steps: '2.1M' }
  }
];

export default function RoverDashboard() {
  const navigate = useNavigate();
  const [selIdx, setSelIdx] = useState(0);
  const [logIdx, setLogIdx] = useState([0, 0]);
  const [liveData, setLiveData] = useState<{mars: any, moon: any} | null>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry/live');
        if (res.ok) {
          const data = await res.json();
          setLiveData(data);
        }
      } catch (err) {}
    };
    fetchTelemetry();
    const telemetryInterval = setInterval(fetchTelemetry, 30000); 
    return () => clearInterval(telemetryInterval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setLogIdx(prev => prev.map((v, i) => (i === selIdx ? Math.min(v + 1, ROVERS[i].logs.length - 1) : v)));
    }, 2500);
    return () => clearInterval(t);
  }, [selIdx]);

  useEffect(() => {
    setLogIdx(prev => {
      const next = [...prev];
      next[selIdx] = 0;
      return next;
    });
  }, [selIdx]);

  const rovers = ROVERS.map(r => {
    if (liveData && r.id === 'mars' && liveData.mars) return { ...r, ...liveData.mars };
    if (liveData && r.id === 'moon' && liveData.moon) return { ...r, ...liveData.moon };
    return r;
  });

  const rover = rovers[selIdx];
  const activeLogCount = logIdx[selIdx] + 1;

  return (
    <div className="relative h-screen w-screen bg-[#02050a] text-white overflow-hidden flex flex-col font-sans selection:bg-blue-500/30">
      <SpaceBackground starDensity="low" />
      
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none mix-blend-screen" 
           style={{ backgroundColor: `${rover.color}15` }} />

      {/* NAV */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/operations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-xs uppercase tracking-widest group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Hub
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tighter leading-none">PIXIE <span style={{ color: rover.color }}>Dual-System Fleet</span></div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1">Multi-Agent RL Control</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            RL Policy Active
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 grid grid-cols-[320px_1fr_320px] gap-6 p-6 min-h-0">

        {/* LEFT: Fleet & RL Policy */}
        <div className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-[10px] text-white/40 uppercase tracking-widest px-1 flex items-center gap-2 font-semibold">
            <Cpu className="w-3 h-3" /> Independent RL Agents
          </div>

          <div className="space-y-4">
            {rovers.map((r, i) => {
              const isSelected = selIdx === i;
              return (
                <button key={r.id} onClick={() => setSelIdx(i)}
                  className={`relative w-full text-left p-5 rounded-2xl border transition-all duration-300 overflow-hidden group ${
                    isSelected ? 'bg-white/[0.03] shadow-xl' : 'border-white/5 hover:bg-white/[0.02] hover:border-white/20'
                  }`}
                  style={{ borderColor: isSelected ? r.color : undefined }}>
                  
                  {isSelected && (
                    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${r.color}, transparent 70%)` }} />
                  )}

                  <div className="relative flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
                      style={{ background: `${r.color}15`, border: `1px solid ${r.color}40`, boxShadow: isSelected ? `0 0 20px ${r.color}30` : 'none' }}>
                      <Cpu className="w-6 h-6" style={{ color: r.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-black tracking-wider uppercase truncate">{r.name}</div>
                      <div className="text-[10px] text-white/50 font-mono tracking-widest">{r.type}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                      <div className="text-[9px] text-white/40 uppercase mb-0.5">Status</div>
                      <div className="text-xs font-mono font-semibold truncate" style={{ color: r.color }}>{r.status}</div>
                    </div>
                    <div className="bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                      <div className="text-[9px] text-white/40 uppercase mb-0.5">Latency</div>
                      <div className="text-xs font-mono font-semibold truncate text-white">{r.commDelay}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Battery className={`w-4 h-4 shrink-0 ${r.battery < 50 ? 'text-red-400' : 'text-green-400'}`} />
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${r.battery}%`, background: r.battery < 50 ? '#ef4444' : r.color }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/70">{r.battery}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RL Policy Stats */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 mt-auto backdrop-blur-md relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2 font-semibold">
              <Activity className="w-3 h-3" /> Policy Metrics: {rover.name}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Cumulative Reward', value: rover.metrics.reward, unit: 'pts' },
                { label: 'Policy Confidence', value: rover.metrics.confidence,  unit: '%'   },
                { label: 'Total Steps Trained', value: rover.metrics.steps,  unit: ''    },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{m.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: rover.color }}>{m.value} <span className="text-white/30 font-normal">{m.unit}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: AI Decision Stream & Map */}
        <div className="flex flex-col gap-6 min-h-0">

          {/* Terrain Map - Glassmorphic high-tech feel */}
          <div className="bg-black/40 backdrop-blur-xl border rounded-2xl overflow-hidden relative flex-1 shadow-2xl"
            style={{ borderColor: `${rover.color}30` }}>
            <div className="absolute top-5 left-6 z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 bg-black/50 px-2 py-1 rounded-md backdrop-blur-md border border-white/10">
                  Live Terrain Feed
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> REC
                </div>
              </div>
            </div>

            {/* RL Perception Overlay Toggle */}
            <div className="absolute top-5 right-6 z-10 flex gap-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-white bg-white/10 px-3 py-1.5 rounded-md border border-white/20 flex items-center gap-2 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Target className="w-3 h-3" /> RL VALUE MAP ACTIVE
              </div>
            </div>

            {/* Simulated HUD elements */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
              
              {/* Corner brackets */}
              <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-white/20" />
              <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-white/20" />
              <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-white/20" />
              <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-white/20" />
            </div>

            <div className="absolute inset-0 pt-12">
              <svg viewBox="0 0 600 340" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="mars-bg" cx="50%" cy="50%" r="80%">
                    <stop offset="0%" stopColor={selIdx === 0 ? "#3d1a06" : "#1a1c23"} />
                    <stop offset="100%" stopColor="#05080f" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={rover.color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={rover.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect width="600" height="340" fill="url(#mars-bg)" />

                {/* Topographical Contour Lines */}
                <g opacity="0.08">
                  <path d="M0,50 Q150,80 300,40 T600,100" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M0,100 Q150,150 300,90 T600,180" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M0,150 Q150,220 300,140 T600,260" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M0,200 Q150,290 300,190 T600,340" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M0,250 Q150,330 300,280 T600,390" fill="none" stroke="white" strokeWidth="1" />
                </g>

                {/* Grid */}
                <g opacity="0.15">
                  {[100, 200, 300, 400, 500].map(x => <line key={x} x1={x} y1="0" x2={x} y2="340" stroke={rover.color} strokeWidth="1" strokeDasharray="4 4" />)}
                  {[85, 170, 255].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke={rover.color} strokeWidth="1" strokeDasharray="4 4" />)}
                </g>

                {/* Hazard zones calculated by RL */}
                <path d="M420,180 Q470,130 520,180 T470,230 Z" fill="rgba(239,68,68,0.05)" stroke="rgba(239,68,68,0.2)" strokeDasharray="4 4" />
                <text x="435" y="180" fill="rgba(239,68,68,0.4)" fontSize="7" fontFamily="monospace">RL HAZARD: ROUGH TERRAIN</text>
                
                <path d="M80,240 Q130,190 180,240 T130,290 Z" fill="rgba(59,130,246,0.05)" stroke="rgba(59,130,246,0.2)" strokeDasharray="4 4" />
                <text x="100" y="240" fill="rgba(59,130,246,0.4)" fontSize="7" fontFamily="monospace">RL TARGET: HIGH REWARD</text>

                {/* Current position */}
                <g transform="translate(300, 170)">
                  {/* RL Value Heatmap approximation around rover */}
                  <circle cx="0" cy="0" r="100" fill={`url(#pathGrad)`} opacity="0.1" />
                  <circle cx="0" cy="0" r="45" fill={`${rover.color}10`} />
                  <circle cx="0" cy="0" r="25" fill={`${rover.color}20`} className="animate-ping" style={{ animationDuration: '3s' }} />
                  <circle cx="0" cy="0" r="8" fill={rover.color} filter="url(#glow)" />
                  <line x1="-50" y1="0" x2="50" y2="0" stroke={rover.color} strokeWidth="1" opacity="0.4" />
                  <line x1="0" y1="-50" x2="0" y2="50" stroke={rover.color} strokeWidth="1" opacity="0.4" />
                  
                  {/* Planned RL Path */}
                  <path d="M 0,0 Q 40,-40 80,-20 T 140,-50" fill="none" stroke={rover.color} strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
                  <circle cx="80" cy="-20" r="3" fill={rover.color} opacity="0.6" />
                  <circle cx="140" cy="-50" r="4" fill="none" stroke={rover.color} strokeWidth="2" />
                  <text x="148" y="-47" fill={rover.color} fontSize="8" fontFamily="monospace" opacity="0.8">OPTIONAL GOAL (R: +10)</text>
                  <text x="85" y="-12" fill={rover.color} fontSize="7" fontFamily="monospace" opacity="0.6">STEP N+1</text>
                </g>

                {/* Rover info box */}
                <rect x="20" y="270" width="165" height="50" rx="6" fill="rgba(0,0,0,0.7)" stroke={`${rover.color}40`} strokeWidth="1" />
                <text x="30" y="290" fill={rover.color} fontSize="8" fontFamily="monospace" fontWeight="bold">SOL {rover.sol} · RL STATE: NOMINAL</text>
                <text x="30" y="305" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">LOC: {rover.location}</text>
              </svg>
              
              {/* Dust Storm Overlay for Mars */}
              {selIdx === 0 && rover.hazard === 'Dust Storm Active' && (
                <div className="absolute inset-0 bg-orange-900/30 mix-blend-color-dodge pointer-events-none" 
                     style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")', opacity: 0.25 }}>
                </div>
              )}
            </div>
          </div>

          {/* AI Agent Log & RL Visualizer */}
          <div className="border rounded-2xl p-6 bg-black/60 backdrop-blur-xl flex-shrink-0 relative overflow-hidden shadow-2xl flex gap-6"
            style={{ borderColor: `${rover.color}40` }}>
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="flex-1 flex flex-col">
              <div className="relative z-10 flex items-center justify-between mb-5 pb-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${rover.color}40, transparent)`, border: `1px solid ${rover.color}60` }}>
                    <Brain className="w-5 h-5" style={{ color: rover.color }} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-mono text-white/50 mb-0.5">
                      Autonomy Engine
                    </div>
                    <div className="text-base font-black tracking-widest uppercase" style={{ color: rover.color }}>
                      PIXIE RL Policy Feed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 shadow-inner">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-mono text-white/60 font-semibold tracking-wider">Delay: {rover.commDelay}</span>
                </div>
              </div>

              <div className="relative z-10 space-y-3 flex-1 flex flex-col justify-end min-h-[160px]">
                <AnimatePresence>
                  {rover.logs.slice(0, activeLogCount).map((log, i) => {
                    let logStyles = '';
                    let icon = null;

                    if (log.type === 'cmd') {
                      logStyles = 'bg-white/5 border-white/10 text-white/70';
                      icon = <Radio className="w-4 h-4 text-white/40" />;
                    } else if (log.type === 'hazard') {
                      logStyles = 'bg-red-500/10 border-red-500/30 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
                      icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
                    } else if (log.type === 'reject') {
                      logStyles = 'bg-orange-500/10 border-orange-500/30 text-orange-300 font-bold';
                      icon = <Shield className="w-4 h-4 text-orange-400" />;
                    } else if (log.type === 'action') {
                      logStyles = `bg-white/10 text-white font-bold shadow-[0_0_20px_${rover.color}15]`;
                      icon = <Cpu className="w-4 h-4" style={{ color: rover.color }} />;
                    } else if (log.type === 'reward') {
                      logStyles = 'bg-green-500/10 border-green-500/30 text-green-300';
                      icon = <Zap className="w-4 h-4 text-green-400" />;
                    }

                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`flex gap-4 items-center p-3 rounded-xl border backdrop-blur-sm ${logStyles}`}
                        style={log.type === 'action' ? { borderColor: `${rover.color}40`, backgroundColor: `${rover.color}15` } : {}}
                      >
                        <div className="flex items-center gap-3 w-24 shrink-0 border-r border-white/10 pr-3">
                          {icon}
                          <div className="text-[10px] font-mono opacity-60 tracking-wider">{log.time}</div>
                        </div>
                        <div className="text-sm font-mono tracking-wide flex-1">
                          {log.text}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* RL State Space visualization */}
            <div className="w-64 shrink-0 relative z-10 border-l border-white/10 pl-6 flex flex-col justify-between py-2 hidden xl:flex">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-mono text-white/50 mb-3 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> State Vector ($S_t$)
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'BATTERY_LVL', val: `${rover.battery}%`, norm: (rover.battery/100).toFixed(2), col: rover.battery < 50 ? 'text-red-400' : 'text-green-400' },
                    { label: 'THERMAL_GRAD', val: `${rover.temp}°C`, norm: Math.max(0, (rover.temp + 100)/200).toFixed(2), col: 'text-blue-400' },
                    { label: 'TERRAIN_ROUGH', val: selIdx === 0 ? '0.85' : '0.20', norm: selIdx === 0 ? '0.85' : '0.20', col: selIdx === 0 ? 'text-orange-400' : 'text-green-400' },
                    { label: 'SOLAR_IRRAD', val: selIdx === 0 ? 'LOW' : 'HIGH', norm: selIdx === 0 ? '0.15' : '0.90', col: selIdx === 0 ? 'text-red-400' : 'text-yellow-400' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-white/40">{s.label}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/60 w-12 text-right">{s.val}</span>
                         <span className={`text-[9px] font-mono font-bold ${s.col} w-10 text-right`}>[{s.norm}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-widest font-mono text-white/50 mb-3 flex items-center gap-2">
                  <Network className="w-3 h-3" /> Action Probabilities ($\pi_\theta$)
                </div>
                <div className="flex justify-between items-end h-[60px] gap-2">
                   {[
                     { action: 'DRIVE', p: selIdx === 0 ? 0.05 : 0.82, h: selIdx === 0 ? '5%' : '82%', active: selIdx !== 0 },
                     { action: 'DRILL', p: selIdx === 0 ? 0.02 : 0.10, h: selIdx === 0 ? '2%' : '10%', active: false },
                     { action: 'SAFE', p: selIdx === 0 ? 0.90 : 0.01, h: selIdx === 0 ? '90%' : '1%', active: selIdx === 0 },
                     { action: 'COMM', p: selIdx === 0 ? 0.03 : 0.07, h: selIdx === 0 ? '3%' : '7%', active: false },
                   ].map(a => (
                     <div key={a.action} className="flex flex-col items-center flex-1">
                       <span className={`text-[8px] font-mono mb-1 ${a.active ? '' : 'text-white/30'}`} style={{ color: a.active ? rover.color : undefined }}>{a.p.toFixed(2)}</span>
                       <div className="w-full bg-white/5 rounded-t-sm relative flex items-end justify-center" style={{ height: '40px' }}>
                          <motion.div className="w-full rounded-t-sm" style={{ height: a.h, backgroundColor: a.active ? rover.color : 'rgba(255,255,255,0.2)' }} />
                       </div>
                       <span className={`text-[8px] font-mono mt-1 tracking-wider ${a.active ? 'text-white font-bold' : 'text-white/40'}`}>{a.action}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Telemetry panels */}
        <div className="flex flex-col gap-5 overflow-y-auto pl-2 custom-scrollbar">
          <div className="text-[10px] text-white/40 uppercase tracking-widest px-1 flex items-center gap-2 font-semibold">
            <Radio className="w-3 h-3" /> Live Telemetry
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-900/10 border border-red-500/30 rounded-2xl p-5 mb-1 flex items-start gap-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-[10px] text-red-400/70 uppercase tracking-widest mb-1.5 font-mono font-semibold">Environment Hazard</div>
              <div className="text-base font-black text-red-300 uppercase tracking-wide">{rover.hazard}</div>
            </div>
          </div>

          {[
            { label: 'Battery',     value: `${rover.battery}`, unit: '%',  icon: Battery,     col: rover.battery < 50 ? '#ef4444' : '#22c55e' },
            { label: 'Temperature', value: `${rover.temp}`,    unit: '°C', icon: Thermometer, col: '#3b82f6' },
            { label: 'Sol',         value: `${rover.sol}`,     unit: '',   icon: Navigation,  col: rover.color },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono font-semibold">{item.label}</div>
                <div className="text-3xl font-black font-mono tracking-tighter" style={{ color: item.col }}>
                  {item.value}<span className="text-sm text-white/30 ml-1 tracking-normal">{item.unit}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-6 h-6 text-white/40" />
              </div>
            </div>
          ))}

          {/* Sub-systems */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-5 mt-auto">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-5 font-semibold flex items-center gap-2">
              <Target className="w-3 h-3" /> Sub-Systems
            </div>
            <div className="space-y-4">
              {[
                { label: 'Science Arm', val: 100, col: '#22c55e', status: 'Ready'   },
                { label: 'Drive Motors', val: selIdx === 0 ? 0 : 85,  col: selIdx === 0 ? '#ef4444' : '#3b82f6', status: selIdx === 0 ? 'Safed' : 'Normal'  },
                { label: 'Comms Array', val: 40, col: '#f97316', status: 'Delayed' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="text-[10px] text-white/40 w-20 shrink-0 font-mono tracking-wider uppercase">{s.label}</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full shadow-[0_0_10px_currentColor]" style={{ background: s.col, color: s.col }}
                      initial={{ width: 0 }} animate={{ width: `${s.val}%` }} transition={{ duration: 1 }} />
                  </div>
                  <div className="text-[10px] font-mono font-bold shrink-0 w-12 text-right" style={{ color: s.col }}>{s.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

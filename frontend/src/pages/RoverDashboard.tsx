import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Cpu, Battery, Thermometer, Navigation, Activity, Shield, Zap, Radio, MapPin } from 'lucide-react';

const ROVERS = [
  { id: 'perseverance', name: 'Perseverance',  color: '#f97316', sol: 1158, location: 'Jezero Crater',   battery: 87, temp: -63, status: 'Exploring' },
  { id: 'curiosity',    name: 'Curiosity',     color: '#3b82f6', sol: 4358, location: 'Gale Crater',     battery: 72, temp: -70, status: 'Sampling'  },
  { id: 'pixel',       name: 'PIXEL-1',        color: '#a855f7', sol: 22,   location: 'Isidis Planitia', battery: 94, temp: -55, status: 'Navigating'},
];

const AI_ACTIONS = [
  ['Planning: optimal route to science target 7A.', 'Hazard detected — rerouting 12° west.', 'Sample collected. Sending telemetry uplink.'],
  ['Drill sequence initiated at waypoint B-11.', 'Battery low — entering solar charge mode.', 'Weather anomaly logged. AI adjusting schedule.'],
  ['RL policy converged on terrain type: basalt.', 'Autonomous science trigger activated.', 'Navigation confidence: 98.4%. Proceeding.'],
];

function RoverMap({ rover }: { rover: typeof ROVERS[0] }) {
  const [trail] = useState(() => Array.from({ length: 8 }, (_, i) => ({
    x: 30 + i * 8 + Math.random() * 6,
    y: 40 + Math.sin(i * 0.8) * 15 + Math.random() * 8,
  })));

  const cur = trail[trail.length - 1];

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#1a0e05]">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Terrain */}
        <defs>
          <radialGradient id={`tg-${rover.id}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(120,60,20,0.4)" />
            <stop offset="100%" stopColor="rgba(30,12,4,0.8)" />
          </radialGradient>
        </defs>
        <rect width="200" height="120" fill={`url(#tg-${rover.id})`} />
        {/* Terrain texture dots */}
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={(i * 37) % 200} cy={(i * 53) % 120} r={Math.random() * 3 + 0.5}
            fill="rgba(180,100,40,0.2)" />
        ))}
        {/* Grid */}
        {[40, 80, 120, 160].map(x => <line key={x} x1={x} y1="0" x2={x} y2="120" stroke="rgba(255,150,50,0.08)" strokeWidth="0.5" />)}
        {[30, 60, 90].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,150,50,0.08)" strokeWidth="0.5" />)}

        {/* Trail */}
        <polyline points={trail.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke={rover.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />

        {/* Waypoints */}
        {trail.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={rover.color} opacity="0.4" />
        ))}

        {/* Rover position */}
        <circle cx={cur.x} cy={cur.y} r="8" fill={`${rover.color}20`} />
        <circle cx={cur.x} cy={cur.y} r="4" fill={rover.color} className="animate-pulse" />
        <circle cx={cur.x} cy={cur.y} r="8" fill="none" stroke={rover.color} strokeWidth="1" opacity="0.6" />
        {/* Crosshairs */}
        <line x1={cur.x - 12} y1={cur.y} x2={cur.x + 12} y2={cur.y} stroke={rover.color} strokeWidth="0.7" opacity="0.5" />
        <line x1={cur.x} y1={cur.y - 12} x2={cur.x} y2={cur.y + 12} stroke={rover.color} strokeWidth="0.7" opacity="0.5" />

        {/* Science target */}
        <polygon points={`160,35 163,42 157,42`} fill="#eab308" opacity="0.8" />
        <text x="164" y="42" fill="#eab308" fontSize="5" opacity="0.7">TARGET</text>
      </svg>
      <div className="absolute bottom-2 left-3 text-[9px] font-mono opacity-60" style={{ color: rover.color }}>
        📍 {rover.location}
      </div>
    </div>
  );
}

export default function RoverDashboard() {
  const navigate = useNavigate();
  const [selIdx, setSelIdx] = useState(0);
  const [logIdx, setLogIdx] = useState([0, 0, 0]);
  const [metrics, setMetrics] = useState(ROVERS.map(r => ({ battery: r.battery, temp: r.temp, signal: 88 })));

  useEffect(() => {
    const t = setInterval(() => {
      setLogIdx(prev => prev.map((v, i) => (i === selIdx ? (v + 1) % AI_ACTIONS[i].length : v)));
      setMetrics(prev => prev.map(m => ({
        battery: Math.max(40, Math.min(100, m.battery + (Math.random() * 2 - 1))),
        temp:    Math.max(-90, Math.min(-40, m.temp + (Math.random() * 2 - 1))),
        signal:  Math.max(60, Math.min(100, m.signal + (Math.random() * 4 - 2))),
      })));
    }, 4000);
    return () => clearInterval(t);
  }, [selIdx]);

  const rover = ROVERS[selIdx];
  const cur = metrics[selIdx];

  return (
    <div className="h-screen w-screen bg-[#080c14] text-white overflow-hidden flex flex-col font-sans">
      {/* NAV */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/operations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Hub
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xl font-black tracking-tighter">PIXEL <span className="text-orange-400">Rover Fleet</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            RL Agent Active
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs uppercase tracking-widest">
            3 Rovers Online
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[260px_1fr_280px] gap-4 p-4 min-h-0">

        {/* LEFT: Fleet */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 flex items-center gap-2">
            <Cpu className="w-3 h-3" /> Active Rovers
          </div>

          {ROVERS.map((r, i) => (
            <button key={r.id} onClick={() => setSelIdx(i)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selIdx === i ? 'border-opacity-60 bg-white/5' : 'border-white/10 hover:bg-white/5'}`}
              style={{ borderColor: selIdx === i ? r.color : undefined }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${r.color}20`, border: `1px solid ${r.color}50` }}>
                  <Cpu className="w-4 h-4" style={{ color: r.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{r.name}</div>
                  <div className="text-[10px] text-white/30 font-mono">Sol {r.sol}</div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30` }}>
                  {r.status}
                </span>
              </div>

              {/* Mini battery bar */}
              <div className="flex items-center gap-2">
                <Battery className="w-3 h-3 text-white/30 shrink-0" />
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${metrics[i].battery}%`, background: r.color }} />
                </div>
                <span className="text-[9px] font-mono text-white/30">{Math.floor(metrics[i].battery)}%</span>
              </div>
            </button>
          ))}

          {/* RL Policy Stats */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mt-auto">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" /> RL Policy Metrics
            </div>
            {[
              { label: 'Reward (episode)', value: '847.3', unit: 'pts' },
              { label: 'Policy confidence', value: '96.2',  unit: '%'   },
              { label: 'Exploration rate', value: '4.8',   unit: 'ε'   },
              { label: 'Steps trained',    value: '2.4M',  unit: ''    },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[9px] text-white/30 font-mono uppercase">{m.label}</span>
                <span className="text-xs font-mono text-orange-400">{m.value} <span className="text-white/30">{m.unit}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Terrain Map + Telemetry */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Terrain Map */}
          <div className="bg-[#0d0804] border rounded-2xl overflow-hidden relative flex-1"
            style={{ borderColor: `${rover.color}30` }}>
            <div className="absolute top-4 left-6 z-10 flex items-center gap-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                Terrain Map · {rover.name}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${rover.color}15`, color: rover.color, border: `1px solid ${rover.color}30` }}>
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: rover.color }} />
                {rover.status}
              </div>
            </div>

            {/* Large terrain SVG */}
            <div className="absolute inset-0 pt-10">
              <svg viewBox="0 0 600 340" className="w-full h-full">
                <defs>
                  <radialGradient id="mars-bg" cx="50%" cy="50%" r="80%">
                    <stop offset="0%" stopColor="#3d1a06" />
                    <stop offset="100%" stopColor="#0d0804" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect width="600" height="340" fill="url(#mars-bg)" />

                {/* Terrain features */}
                {Array.from({ length: 40 }, (_, i) => (
                  <ellipse key={i} cx={(i * 97) % 600} cy={(i * 73) % 340}
                    rx={Math.random() * 20 + 5} ry={Math.random() * 12 + 3}
                    fill="rgba(180,80,20,0.12)" />
                ))}

                {/* Grid */}
                {[100, 200, 300, 400, 500].map(x => <line key={x} x1={x} y1="0" x2={x} y2="340" stroke={`${rover.color}15`} strokeWidth="0.5" />)}
                {[85, 170, 255].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke={`${rover.color}15`} strokeWidth="0.5" />)}

                {/* Rover trail */}
                <polyline points="80,200 130,185 190,175 250,180 310,165 370,155 420,160 470,145"
                  fill="none" stroke={rover.color} strokeWidth="2" strokeDasharray="6 3" opacity="0.8" />

                {/* Old waypoints */}
                {[80, 130, 190, 250, 310, 370, 420].map((x, i) => {
                  const ys = [200, 185, 175, 180, 165, 155, 160];
                  return <circle key={x} cx={x} cy={ys[i]} r="3" fill={rover.color} opacity="0.3" />;
                })}

                {/* Current position */}
                <circle cx="470" cy="145" r="20" fill={`${rover.color}10`} />
                <circle cx="470" cy="145" r="10" fill={`${rover.color}25`} className="animate-pulse" />
                <circle cx="470" cy="145" r="6" fill={rover.color} filter="url(#glow)" />
                <line x1="440" y1="145" x2="500" y2="145" stroke={rover.color} strokeWidth="1" opacity="0.6" />
                <line x1="470" y1="115" x2="470" y2="175" stroke={rover.color} strokeWidth="1" opacity="0.6" />

                {/* Target */}
                <circle cx="540" cy="100" r="12" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
                <circle cx="540" cy="100" r="4" fill="#eab308" opacity="0.9" />
                <text x="555" y="96" fill="#eab308" fontSize="9" opacity="0.8">SCIENCE TARGET</text>

                {/* Distance to target line */}
                <line x1="470" y1="145" x2="540" y2="100" stroke="#eab30850" strokeWidth="1" strokeDasharray="4 2" />
                <text x="490" y="118" fill="#eab308" fontSize="7" opacity="0.6">~82m</text>

                {/* Rover info box */}
                <rect x="10" y="270" width="120" height="60" rx="4" fill="rgba(0,0,0,0.6)" stroke={`${rover.color}40`} strokeWidth="0.5" />
                <text x="20" y="285" fill={rover.color} fontSize="7" fontFamily="monospace">SOL {rover.sol}</text>
                <text x="20" y="298" fill="rgba(255,255,255,0.5)" fontSize="6.5" fontFamily="monospace">LAT: 18.44°N</text>
                <text x="20" y="310" fill="rgba(255,255,255,0.5)" fontSize="6.5" fontFamily="monospace">LON: 77.45°E</text>
                <text x="20" y="322" fill="rgba(255,255,255,0.5)" fontSize="6.5" fontFamily="monospace">ALT: -2.1km</text>
              </svg>
            </div>
          </div>

          {/* AI Agent Log */}
          <div className="border rounded-2xl p-4 flex items-center gap-4"
            style={{ background: `${rover.color}08`, borderColor: `${rover.color}25` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${rover.color}20` }}>
              <Shield className="w-4 h-4" style={{ color: rover.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-widest mb-1 font-mono" style={{ color: `${rover.color}80` }}>
                PIXEL RL Agent · {rover.name} Decision Stream
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={logIdx[selIdx]} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} className="text-sm font-mono text-white/80 truncate">
                  &gt; {AI_ACTIONS[selIdx][logIdx[selIdx]]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: rover.color }} />
          </div>
        </div>

        {/* RIGHT: Telemetry panels */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 flex items-center gap-2">
            <Radio className="w-3 h-3" /> Live Telemetry
          </div>

          {[
            { label: 'Battery',     value: `${Math.floor(cur.battery)}`, unit: '%',  icon: Battery,     col: '#22c55e' },
            { label: 'Temperature', value: `${Math.floor(cur.temp)}`,    unit: '°C', icon: Thermometer,  col: '#f97316' },
            { label: 'Signal Str.', value: `${Math.floor(cur.signal)}`,  unit: '%',  icon: Radio,        col: '#3b82f6' },
            { label: 'Sol',         value: `${rover.sol}`,               unit: '',   icon: Navigation,   col: rover.color },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4 flex items-center justify-between hover:border-white/20 transition-colors">
              <div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-mono">{item.label}</div>
                <div className="text-2xl font-black font-mono tracking-tighter" style={{ color: item.col }}>{item.value}</div>
              </div>
              <item.icon className="w-5 h-5 text-white/20" />
              <div className="text-xs text-white/20 font-mono">{item.unit}</div>
            </div>
          ))}

          {/* Sub-systems */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Sub-Systems</div>
            {[
              { label: 'Science Arm', val: 100, col: '#22c55e', status: 'Ready'   },
              { label: 'Drive Motors', val: 92,  col: '#3b82f6', status: 'Normal'  },
              { label: 'Comms Array', val: Math.floor(cur.signal), col: '#a855f7', status: 'Active' },
              { label: 'REMS Sensor',  val: 88,  col: '#f97316', status: 'Logging' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 mb-2.5">
                <div className="text-[9px] text-white/30 w-20 shrink-0 font-mono">{s.label}</div>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: s.col }}
                    initial={{ width: 0 }} animate={{ width: `${s.val}%` }} transition={{ duration: 1 }} />
                </div>
                <div className="text-[9px] font-mono shrink-0" style={{ color: s.col }}>{s.status}</div>
              </div>
            ))}
          </div>

          {/* Mission progress */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex-1">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Mission Objectives
            </div>
            {[
              { task: 'Collect rock sample #7', done: true  },
              { task: 'Analyze soil composition', done: true  },
              { task: 'Reach science target 7A',  done: false },
              { task: 'Deploy atmospheric sensor', done: false },
            ].map((obj, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5">
                <div className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${obj.done ? 'bg-green-500/30 border-green-500/60' : 'border-white/20'}`}>
                  {obj.done && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </div>
                <span className={`text-[10px] font-mono ${obj.done ? 'text-white/30 line-through' : 'text-white/70'}`}>{obj.task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

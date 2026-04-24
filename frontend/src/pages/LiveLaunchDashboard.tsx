import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Upload, Settings, Target, Activity, Zap, Shield, Radar, AlertTriangle, Disc3, Crosshair, ChevronDown, Repeat } from 'lucide-react';

export default function LiveLaunchDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [altitude, setAltitude] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [time, setTime] = useState(0);
  const [systemHealth, setSystemHealth] = useState(98);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(t => t + 1);
      setAltitude(a => a + (velocity / 1000));
      setVelocity(v => v < 28000 ? v + 150 : 28000);
      setFuel(f => Math.max(0, f - 0.15));
      
      if (Math.random() > 0.9) {
        setSystemHealth(h => Math.max(70, Math.min(100, h + (Math.random() * 4 - 2))));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [velocity]);

  // Circular gauge calculations
  const altitudeProgress = Math.min((altitude / 400) * 100, 100);
  
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden select-none">
      
      {/* Background Rocket Image with HUD Overlays */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black z-10" />
        
        {/* Subtle radial gradients for lighting */}
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-white/10 blur-[100px] rounded-full z-10 pointer-events-none mix-blend-screen" />
        
        <motion.img 
          src="/rocket-launch.png" 
          alt="Rocket Launch" 
          className="w-[120%] h-[120%] object-cover opacity-60 mix-blend-screen filter grayscale brightness-110 contrast-125"
          animate={{ scale: [1, 1.02, 1], rotate: [0, 0.5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)] pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 w-full">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
            PIXEL <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono tracking-widest text-white/80">OS</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/missions/${id}`)}
              className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Abort
            </button>
            <button className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2">
              Phase <ChevronDown className="w-3 h-3" />
            </button>
            <button className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2">
              Telemetry <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="px-6 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs uppercase tracking-widest flex items-center gap-2">
            System status: <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Nominal
          </div>
          <div className="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs uppercase tracking-widest">
            AI Autonomous Mode
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-white/50" />
            <input type="text" placeholder="Search parameters..." className="bg-transparent border-none outline-none text-xs w-32 text-white placeholder:text-white/30" />
          </div>
          <button className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"><Upload className="w-4 h-4" /></button>
          <button className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"><Settings className="w-4 h-4" /></button>
        </div>
      </nav>

      <div className="relative z-20 flex h-[calc(100vh-100px)] px-8 pb-8 gap-8">
        
        {/* Left Column */}
        <div className="w-[320px] flex flex-col gap-6 h-full pt-8">
          <div className="text-sm uppercase tracking-widest text-white/50 mb-2">Flight Metrics</div>
          
          {/* Altitude Panel */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors cursor-pointer">
              <Target className="w-4 h-4 text-white/50" />
            </div>
            <h3 className="text-sm text-white/80 mb-6">Altitude</h3>
            
            <div className="relative w-full aspect-square flex items-center justify-center mb-4">
              {/* Complex SVG Radar/Gauge */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeDasharray="2 4" />
                <circle 
                  cx="50" cy="50" r="30" 
                  fill="none" 
                  stroke="url(#gradient-alt)" 
                  strokeWidth="2" 
                  strokeDasharray="188.5" 
                  strokeDashoffset={188.5 - (188.5 * altitudeProgress) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1" strokeDasharray="1 3" />
                <circle cx="50" cy="50" r="4" fill="rgba(239,68,68,0.8)" className="animate-pulse" />
                <defs>
                  <linearGradient id="gradient-alt" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] text-white/30 font-mono flex flex-col gap-2">
                <span>0.004</span>
                <span>0.003</span>
                <span>0.002</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end border-t border-white/10 pt-4">
              <div className="font-mono text-xs bg-white/5 px-2 py-1 rounded text-white/60">T+{time}s</div>
              <div className="font-mono text-sm tracking-widest">{altitude.toFixed(2)} km</div>
            </div>
          </div>

          {/* Velocity Panel */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group flex-grow">
            <div className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors cursor-pointer">
              <Activity className="w-4 h-4 text-white/50" />
            </div>
            <h3 className="text-sm text-white/80 mb-6">Velocity</h3>
            
            <div className="h-24 w-full flex items-end gap-1 mb-6">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t-sm transition-all duration-500 ${i > 15 ? 'bg-red-500/50' : 'bg-white/20'}`}
                  style={{ height: `${Math.max(10, Math.min(100, (velocity / 28000) * 100 * (i/20 + 0.2)))}%` }}
                />
              ))}
            </div>
            
            <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-auto">
              <div className="font-mono text-xs bg-white/5 px-2 py-1 rounded text-white/60">MACH {(velocity / 1225).toFixed(1)}</div>
              <div className="font-mono text-sm tracking-widest">{Math.floor(velocity).toLocaleString()} km/h</div>
            </div>
          </div>
        </div>

        {/* Center Canvas UI Overlays */}
        <div className="flex-grow relative pt-12">
          {/* Target Reticle 1 */}
          <div className="absolute top-[30%] left-[25%] flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <Crosshair className="w-16 h-16 text-white/30 animate-[spin_10s_linear_infinite]" />
              <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="hidden md:block">
              <div className="w-32 h-px bg-gradient-to-r from-red-500/50 to-transparent mb-1 -rotate-12 origin-left" />
              <div className="text-[10px] uppercase tracking-widest text-red-400 font-mono">Stage 1 Integrity</div>
              <div className="text-xs text-white">Nominal (99.8%)</div>
            </div>
          </div>

          {/* Target Reticle 2 */}
          <div className="absolute top-[20%] right-[30%] flex flex-row-reverse items-center gap-4">
            <div className="relative w-12 h-12 border border-blue-500/30 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border border-white/20 rounded-full" />
              <div className="absolute w-1 h-1 bg-blue-400 rounded-full" />
              <div className="absolute top-0 w-px h-2 bg-blue-400" />
              <div className="absolute bottom-0 w-px h-2 bg-blue-400" />
              <div className="absolute left-0 w-2 h-px bg-blue-400" />
              <div className="absolute right-0 w-2 h-px bg-blue-400" />
            </div>
            <div className="text-right hidden md:block">
              <div className="text-[10px] uppercase tracking-widest text-blue-400 font-mono">Payload Fairing</div>
              <div className="text-xs text-white">Temperature: 124°C</div>
            </div>
            <div className="w-32 h-px bg-gradient-to-l from-blue-500/50 to-transparent mt-4 rotate-12 origin-right hidden md:block" />
          </div>

          {/* Center Coordinates */}
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-40">
            <div className="w-8 h-px bg-white/50" />
            <div className="font-mono text-[10px] tracking-[0.3em]">LAT: 28.608° N | LNG: 80.604° W</div>
            <div className="w-8 h-px bg-white/50" />
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[340px] flex flex-col gap-6 h-full pt-8">
          
          {/* Anomalies Panel */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">01</div>
            <h3 className="text-sm text-white/80 mb-6 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" /> Active Risks</h3>
            
            <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl p-4 border border-white/5 mb-4">
              <div className="flex gap-4">
                <div className="w-16 h-12 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                   <img src="/rocket-launch.png" className="w-full h-full object-cover filter brightness-50 contrast-150" />
                </div>
                <div>
                  <div className="text-sm font-mono tracking-widest">WIND-SHEAR</div>
                  <div className="text-[10px] text-white/40 uppercase mt-1">High Altitude Current</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                <div className="text-white/40">Zone</div><div className="text-right">Tropsphere</div>
                <div className="text-white/40">Type</div><div className="text-right">Atmospheric</div>
                <div className="text-white/40">Severity</div><div className="text-right text-orange-400 flex items-center justify-end gap-1"><span className="w-1 h-1 bg-orange-400 rounded-full" /> Moderate</div>
              </div>
            </div>
            
            <button className="w-full py-3 bg-gradient-to-r from-blue-500/20 to-blue-400/20 hover:from-blue-500/30 hover:to-blue-400/30 border border-blue-500/30 text-blue-400 rounded-xl text-xs uppercase tracking-widest transition-all">
              Calculate Avoidance
            </button>
          </div>

          {/* Trajectory Radar */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col relative overflow-hidden">
            <h3 className="text-sm text-white/80 mb-2">Target Orbit Deviation</h3>
            
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[180px] h-[180px] opacity-80 mix-blend-screen">
               <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_20s_linear_infinite]">
                 {/* Background dots */}
                 <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="1 4" strokeWidth="2" />
                 <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                 {/* Colored arcs */}
                 <circle cx="50" cy="50" r="25" fill="none" stroke="url(#rad-grad)" strokeWidth="15" strokeDasharray="60 100" className="opacity-80" />
                 <circle cx="50" cy="50" r="25" fill="none" stroke="#ef4444" strokeWidth="15" strokeDasharray="20 100" strokeDashoffset="-70" className="opacity-60" />
                 <circle cx="50" cy="50" r="5" fill="#fff" className="animate-pulse" />
                 <defs>
                  <linearGradient id="rad-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
               </svg>
            </div>
            
            <div className="mt-auto space-y-4 pr-12 relative z-10">
              <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-white/40 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Telemetry Variance
              </div>
              <div>
                <div className="text-xs text-white/40 uppercase mb-1">Cross-track</div>
                <div className="font-mono text-xl tracking-wider">0.02 <span className="text-xs text-white/30">deg</span></div>
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="text-xs text-white/40 uppercase mb-1">Probability of success</div>
                <div className="font-mono text-2xl font-black text-green-400">99.8 <span className="text-sm">%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Panel */}
      <div className="absolute bottom-8 left-8 right-8 z-20 flex gap-6 h-32">
        
        {/* Subsystems */}
        <div className="flex-grow bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
          <div className="flex items-center gap-4 mb-2">
            <button className="px-4 py-1.5 bg-white/10 rounded-full text-xs uppercase tracking-widest text-white border border-white/20">Agents</button>
            <button className="px-4 py-1.5 hover:bg-white/5 rounded-full text-xs uppercase tracking-widest text-white/40 transition-colors">Vitals</button>
            <div className="ml-auto flex items-center gap-3 text-white/30">
              <Repeat className="w-4 h-4 cursor-pointer hover:text-white" />
              <Settings className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>
          
          <div className="flex gap-4 h-full">
            {[
              { name: 'PLANNER', status: 'Active', val: 99, color: 'bg-blue-400' },
              { name: 'RESOURCE', status: 'Active', val: fuel, color: 'bg-green-400' },
              { name: 'RISK', status: 'Monitoring', val: systemHealth, color: 'bg-orange-400' }
            ].map((sub, i) => (
              <div key={i} className="flex-1 bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start">
                  <Radar className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  <div className="text-[9px] uppercase tracking-widest flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${sub.color} animate-pulse`} />
                    {sub.status}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">{sub.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">{Math.floor(sub.val)}%</div>
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${sub.color}`} style={{ width: `${sub.val}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global State Summary */}
        <div className="w-[400px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 mb-2">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-white/50" />
              <div className="text-xs uppercase tracking-widest">System Health</div>
            </div>
            <div className="font-mono text-lg font-bold">{Math.floor(systemHealth)}%</div>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 mb-2">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-white/50" />
              <div className="text-xs uppercase tracking-widest">Redundancy</div>
            </div>
            <div className="font-mono text-lg font-bold">3 <span className="text-sm text-white/40">/ 4</span></div>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Disc3 className="w-4 h-4 text-white/50" />
              <div className="text-xs uppercase tracking-widest">Data Link</div>
            </div>
            <div className="font-mono text-lg font-bold">12 <span className="text-sm text-white/40">Mb/s</span></div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

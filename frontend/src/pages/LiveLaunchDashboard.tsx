import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, Terminal, Activity, Zap, Navigation } from 'lucide-react';

const phases = [
  { id: 1, name: 'Liftoff', altitude: 0 },
  { id: 2, name: 'Max-Q', altitude: 12 },
  { id: 3, name: 'Stage Separation', altitude: 65 },
  { id: 4, name: 'Orbit Insertion', altitude: 200 }
];

export default function LiveLaunchDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [altitude, setAltitude] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [logs, setLogs] = useState<{agent: string, msg: string, time: string}[]>([
    { agent: 'System', msg: 'Launch sequence initiated.', time: 'T-00:05' },
    { agent: 'Planner', msg: 'Trajectory locked.', time: 'T-00:03' }
  ]);

  useEffect(() => {
    // Simulate Launch Physics
    const timer = setInterval(() => {
      setAltitude(a => {
        const newAlt = a + (velocity / 1000); // km
        
        // Update phases
        if (newAlt > 200) setCurrentPhase(4);
        else if (newAlt > 65) setCurrentPhase(3);
        else if (newAlt > 12) setCurrentPhase(2);
        
        return newAlt;
      });
      
      setVelocity(v => {
        if (currentPhase === 4) return v; // Orbit speed
        return v + 250; // Accelerating km/h
      });
      
      setFuel(f => Math.max(0, f - 0.2)); // Fuel depletion
      
    }, 1000);

    return () => clearInterval(timer);
  }, [velocity, currentPhase]);

  // Simulate incoming logs
  useEffect(() => {
    const logInterval = setInterval(() => {
      const messages = [
        { agent: 'Planner', msg: 'Optimal trajectory maintained. Pitch 45 deg.' },
        { agent: 'Resource', msg: `Fuel flow nominal. Level: ${fuel.toFixed(1)}%` },
        { agent: 'Risk', msg: 'No anomalies detected. Structure stable.' },
        { agent: 'System', msg: `Altitude reached: ${altitude.toFixed(2)} km` }
      ];
      
      const newLog = messages[Math.floor(Math.random() * messages.length)];
      
      setLogs(prev => {
        const updated = [...prev, { ...newLog, time: `T+${Math.floor(altitude)}s` }];
        return updated.slice(-6); // Keep last 6 logs
      });
    }, 3000);

    return () => clearInterval(logInterval);
  }, [altitude, fuel]);

  return (
    <div className="relative min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
      <SpaceBackground starDensity="high" />
      
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <button 
            onClick={() => navigate(`/missions/${id}`)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold z-50"
          >
            <ArrowLeft className="w-4 h-4" /> Abort Simulation
          </button>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-xl font-mono tracking-widest text-red-500">LIVE TELEMETRY</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 flex-grow">
          {/* LEFT: Rocket Visualization */}
          <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex flex-col items-center justify-end overflow-hidden relative min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent" />
            
            {/* Simulated Rocket */}
            <motion.div 
              className="relative z-10 w-12 h-48 bg-gray-200 rounded-t-full rounded-b-lg mb-20 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <div className="absolute -bottom-16 w-16 h-24 bg-gradient-to-t from-transparent via-orange-500 to-yellow-200 blur-md opacity-80" />
              <div className="absolute -bottom-24 w-8 h-32 bg-white blur-sm opacity-90" />
              
              <span className="text-black font-black uppercase rotate-90 tracking-widest text-xs opacity-50">PIXEL</span>
            </motion.div>
          </div>

          {/* CENTER: Metrics */}
          <div className="lg:col-span-4 grid grid-rows-4 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col justify-center">
              <div className="text-white/50 text-xs uppercase tracking-widest mb-1 flex items-center gap-2"><Navigation className="w-3 h-3" /> Altitude</div>
              <div className="text-4xl font-mono font-black text-white">{altitude.toFixed(2)} <span className="text-lg text-white/40">km</span></div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col justify-center">
              <div className="text-white/50 text-xs uppercase tracking-widest mb-1 flex items-center gap-2"><Activity className="w-3 h-3" /> Velocity</div>
              <div className="text-4xl font-mono font-black text-white">{Math.floor(velocity).toLocaleString()} <span className="text-lg text-white/40">km/h</span></div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col justify-center">
              <div className="text-white/50 text-xs uppercase tracking-widest mb-1 flex items-center gap-2"><Zap className="w-3 h-3" /> Propellant</div>
              <div className="text-4xl font-mono font-black text-blue-400">{fuel.toFixed(1)} <span className="text-lg text-white/40">%</span></div>
              <div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  animate={{ width: `${fuel}%` }}
                />
              </div>
            </div>

            <div className="bg-blue-500/10 backdrop-blur-md rounded-xl border border-blue-500/30 p-6 flex flex-col justify-center">
              <div className="text-blue-400/50 text-xs uppercase tracking-widest mb-1">Current Phase</div>
              <div className="text-2xl font-black text-blue-400 uppercase tracking-wider">
                {phases.find(p => p.id === currentPhase)?.name}
              </div>
            </div>
          </div>

          {/* RIGHT: AI Logs */}
          <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <Terminal className="w-5 h-5 text-white/50" />
              <h2 className="text-sm font-semibold uppercase tracking-widest">AI Core Logic Stream</h2>
            </div>
            
            <div className="flex-grow space-y-4 font-mono text-xs md:text-sm overflow-hidden flex flex-col justify-end">
              {logs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className="text-white/30 shrink-0">[{log.time}]</span>
                  <span className={
                    log.agent === 'Planner' ? 'text-blue-400' :
                    log.agent === 'Resource' ? 'text-green-400' :
                    log.agent === 'Risk' ? 'text-orange-400' : 'text-white/60'
                  }>[{log.agent}]</span>
                  <span className="text-white/80">{log.msg}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* BELOW: Timeline */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-10" />
            <motion.div 
              className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -z-10" 
              animate={{ width: `${((currentPhase - 1) / 3) * 100}%` }}
              transition={{ duration: 1 }}
            />
            
            {phases.map((phase) => (
              <div key={phase.id} className="flex flex-col items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  currentPhase >= phase.id ? 'bg-blue-500 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-black border-white/30'
                } transition-all duration-500`} />
                <span className={`text-xs uppercase tracking-widest font-bold ${
                  currentPhase >= phase.id ? 'text-white' : 'text-white/30'
                }`}>
                  {phase.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

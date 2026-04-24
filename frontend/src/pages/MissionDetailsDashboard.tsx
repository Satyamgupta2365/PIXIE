import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, Rocket, MapPin, Clock, CloudRain, Thermometer, Wind, CheckCircle2 } from 'lucide-react';

const missionData: Record<string, any> = {
  'falcon-9': { name: 'Falcon 9', height: '70 m', payload: '22,800 kg', stages: '2', site: 'Cape Canaveral, LC-39A' },
  'lvm3': { name: 'LVM3', height: '43.5 m', payload: '8,000 kg', stages: '3', site: 'Satish Dhawan, SLP' },
  'sls': { name: 'SLS', height: '98 m', payload: '95,000 kg', stages: '2', site: 'Kennedy Space Center, LC-39B' }
};

export default function MissionDetailsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mission = missionData[id as string] || missionData['falcon-9'];
  
  const [countdown, setCountdown] = useState(3600); // 1 hour
  
  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `T- ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
      <SpaceBackground starDensity="medium" />
      
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <button 
            onClick={() => navigate('/missions')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Missions
          </button>
          <div className="text-right">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{mission.name}</h1>
            <p className="text-blue-500 font-mono text-sm">PRE-FLIGHT DIAGNOSTICS</p>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* LEFT: Rocket Details */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6 text-white/80">
              <Rocket className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold uppercase tracking-wider">Vehicle Specs</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-white/50">Total Height</span>
                <span className="font-mono text-xl">{mission.height}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-white/50">Max Payload</span>
                <span className="font-mono text-xl">{mission.payload}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-white/50">Active Stages</span>
                <span className="font-mono text-xl">{mission.stages}</span>
              </div>
            </div>
          </motion.div>

          {/* CENTER: Launch Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 flex flex-col justify-between"
          >
            <div className="text-center mb-6">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-2">Countdown</h2>
              <div className="text-5xl md:text-6xl font-black font-mono text-blue-500 tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                {formatTime(countdown)}
              </div>
            </div>
            
            <div className="space-y-4 bg-black/30 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white/50" />
                <span className="text-white/80 text-sm uppercase">{mission.site}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="text-white/80 text-sm uppercase">Window: 14:00 - 16:30 UTC</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Weather Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6 text-white/80">
              <CloudRain className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold uppercase tracking-wider">Live Telemetry</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-white/50"><Thermometer className="w-4 h-4" /> Temp</div>
                <span className="font-mono text-xl">22.4°C</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-white/50"><Wind className="w-4 h-4" /> Wind</div>
                <span className="font-mono text-xl">12 km/h</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-white/50"><CloudRain className="w-4 h-4" /> Humidity</div>
                <span className="font-mono text-xl">64%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* AI Decision Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mt-auto"
        >
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-6">AI Council Decision Matrix</h2>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-white/50 uppercase mb-1">Planner Agent</div>
                <div className="font-mono text-green-400">LAUNCH OPTIMAL</div>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-white/50 uppercase mb-1">Resource Agent</div>
                <div className="font-mono text-green-400">FUEL NOMINAL</div>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-white/50 uppercase mb-1">Risk Agent</div>
                <div className="font-mono text-green-400">CONDITIONS STABLE</div>
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <button 
                onClick={() => navigate(`/launch/${id}`)}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-400 font-bold uppercase tracking-widest rounded-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Go For Launch
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

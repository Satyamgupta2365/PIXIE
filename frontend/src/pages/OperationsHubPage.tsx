import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { Satellite, Cpu, ChevronRight, Activity, ShieldAlert, Radar, Globe } from 'lucide-react';

const operations = [
  {
    id: 'satellite',
    title: 'Orbital Fleet',
    subtitle: 'Telemetry & Tracking',
    desc: 'Real-time orbital tracking, collision avoidance, and network health monitoring using live telemetry data.',
    icon: Globe,
    color: '#0ea5e9',
    bgGradient: 'from-sky-500/20 via-sky-900/5 to-transparent',
    path: '/satellites',
    status: 'ONLINE',
    stats: [
      { label: 'ACTIVE NODES', val: '1,240' },
      { label: 'SYS LATENCY', val: '42ms' },
      { label: 'BANDWIDTH', val: '68%' }
    ]
  },
  {
    id: 'rover',
    title: 'Surface Rovers',
    subtitle: 'Deep Autonomy',
    desc: 'Reinforcement learning driven autonomous navigation for multi-agent surface exploration and hazard avoidance.',
    icon: Cpu,
    color: '#f97316',
    bgGradient: 'from-orange-500/20 via-orange-900/5 to-transparent',
    path: '/rovers',
    status: 'ACTIVE',
    stats: [
      { label: 'AGENTS DEPLOYED', val: '02' },
      { label: 'MISSION SOL', val: '1820' },
      { label: 'RL CONFIDENCE', val: '99.1%' }
    ]
  },
  {
    id: 'collision',
    title: 'Collision AI',
    subtitle: 'Conjunction Analysis',
    desc: 'Deep learning pipeline for orbital debris tracking, risk assessment, and autonomous avoidance maneuvers.',
    icon: ShieldAlert,
    color: '#ef4444',
    bgGradient: 'from-red-500/20 via-red-900/5 to-transparent',
    path: '/satellites',
    status: 'STANDBY',
    stats: [
      { label: 'ACTIVE THREATS', val: '06' },
      { label: 'MODEL VER', val: 'v4.2.1' },
      { label: 'PREDICTION ACC', val: '99.9%' }
    ]
  }
];

export default function OperationsHubPage() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen bg-[#02050a] text-white p-6 overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-blue-500/30">
      <SpaceBackground starDensity="high" />
      
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-1000"
           style={{ backgroundColor: hovered ? operations.find(o => o.id === hovered)?.color + '05' : 'transparent' }} />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto pt-10 pb-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-white/60 mb-8 uppercase backdrop-blur-md">
            <Activity className="w-3 h-3 text-blue-400" /> PIXIE Mission Control
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 flex flex-col items-center gap-2">
            <span>Operations <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Hub</span></span>
          </h1>
          <p className="text-white/40 text-lg max-w-2xl mx-auto font-light tracking-wide">
            Select a designated operational domain. All integrated systems are governed by the PIXIE Reinforcement Learning Core.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {operations.map((op, index) => {
            const isHovered = hovered === op.id;
            return (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHovered(op.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div 
                  onClick={() => navigate(op.path)}
                  className={`group relative h-[520px] flex flex-col p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border transition-all duration-500 cursor-pointer overflow-hidden`}
                  style={{ 
                    borderColor: isHovered ? `${op.color}80` : 'rgba(255,255,255,0.05)',
                    transform: isHovered ? 'translateY(-12px)' : 'translateY(0)',
                    boxShadow: isHovered ? `0 20px 40px -10px ${op.color}30` : '0 10px 30px -10px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Background Gradients & Patterns */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${op.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700" 
                       style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  {/* Corner Accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-white/0 group-hover:border-white/20 transition-colors duration-500 rounded-tl-3xl" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-white/0 group-hover:border-white/20 transition-colors duration-500 rounded-br-3xl" />

                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-10">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ backgroundColor: op.color }} />
                        <op.icon className="w-8 h-8 text-white/80 group-hover:text-white transition-colors relative z-10" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/50 shadow-inner">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: op.color }} />
                        <span className="text-[9px] font-mono tracking-widest uppercase text-white/70">{op.status}</span>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <div className="text-[10px] font-mono text-white/40 mb-3 uppercase tracking-widest">{op.subtitle}</div>
                      <h2 className="text-3xl font-black mb-4 uppercase tracking-wider group-hover:tracking-widest transition-all duration-500" style={{ color: isHovered ? op.color : '#fff' }}>
                        {op.title}
                      </h2>
                      <p className="text-white/50 text-sm font-light leading-relaxed">
                        {op.desc}
                      </p>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-8 mt-auto">
                      {op.stats.map(s => (
                        <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center group-hover:bg-white/[0.04] transition-colors">
                           <span className="text-[8px] text-white/40 font-mono uppercase tracking-widest mb-1.5">{s.label}</span>
                           <span className="text-sm font-bold font-mono text-white/80">{s.val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between mt-auto group-hover:border-white/20 transition-colors">
                      <span className="uppercase tracking-widest text-xs font-semibold text-white/50 group-hover:text-white transition-colors flex items-center gap-2">
                        <Radar className="w-4 h-4" /> Initialize Sequence
                      </span>
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white text-white/50 group-hover:text-black transition-all duration-300">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

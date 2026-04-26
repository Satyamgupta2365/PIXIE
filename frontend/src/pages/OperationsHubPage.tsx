import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { Satellite, Cpu, Radio, ChevronRight, Activity } from 'lucide-react';

const operations = [

  {
    id: 'satellite',
    title: 'Satellite Network',
    subtitle: 'Orbital Mechanics',
    desc: 'Real-time orbital tracking, collision avoidance, and network health monitoring using live telemetry data.',
    icon: Satellite,
    color: 'from-blue-500/20 to-cyan-900/20',
    border: 'group-hover:border-blue-500/50',
    path: '/satellites',
    status: 'ACTIVE'
  },
  {
    id: 'rover',
    title: 'Surface Rovers',
    subtitle: 'Multi-Agent Swarm',
    desc: 'Reinforcement learning driven autonomous navigation for multiple Mars rovers. Terrain mapping and hazard avoidance.',
    icon: Cpu,
    color: 'from-purple-500/20 to-indigo-900/20',
    border: 'group-hover:border-purple-500/50',
    path: '/rovers',
    status: 'INITIALIZING'
  }
];

export default function OperationsHubPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-black text-white p-6 overflow-hidden flex flex-col items-center justify-center">
      <SpaceBackground starDensity="high" />
      
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-white/60 mb-6 uppercase">
            <Activity className="w-3 h-3 text-blue-400" /> System Wide Operations
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">
            Command <span className="text-blue-500">Center</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto font-light">
            Select an operational domain. All systems are governed by PIXIE's reinforcement learning core.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {operations.map((op, index) => (
            <motion.div
              key={op.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div 
                onClick={() => navigate(op.path)}
                className={`group relative h-full flex flex-col p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer ${op.border}`}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${op.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <op.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className={`text-[10px] font-mono px-3 py-1 rounded-full uppercase tracking-widest border ${
                      op.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                      {op.status}
                    </span>
                  </div>
                  
                  <div className="text-xs font-mono text-white/40 mb-2 uppercase tracking-widest">{op.subtitle}</div>
                  <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">{op.title}</h2>
                  <p className="text-white/60 font-light leading-relaxed mb-8">
                    {op.desc}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                    <span className="uppercase tracking-widest text-xs">Access Terminal</span>
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

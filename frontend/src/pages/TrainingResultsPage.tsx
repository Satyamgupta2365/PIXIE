import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, TrendingUp, Brain, Shield, Zap } from 'lucide-react';

export default function TrainingResultsPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
      <SpaceBackground starDensity="low" />
      
      <div className="relative z-10 max-w-5xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-white/10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Base
          </button>
          <div className="text-right">
            <h1 className="text-3xl font-black uppercase tracking-tighter">AI Training Protocol</h1>
            <p className="text-blue-500 font-mono text-sm">GRPO RL PIPELINE</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Main Stat Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 mb-8 text-white/80">
              <Brain className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Evolution Metrics</h2>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Initial Reward</div>
                  <div className="text-3xl font-mono text-white/60">0.42</div>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <div>
                  <div className="text-blue-400/60 text-xs uppercase tracking-widest mb-1">Final Reward</div>
                  <div className="text-5xl font-mono font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">0.78</div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="text-white/60 font-medium">Net Improvement</div>
                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-lg font-bold text-xl">
                  <TrendingUp className="w-5 h-5" /> +85%
                </div>
              </div>
            </div>
          </motion.div>

          {/* Graph Simulation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col"
          >
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-6">Reward Trajectory</h2>
            
            <div className="flex-grow flex items-end justify-between gap-2 h-48 border-b border-l border-white/10 p-4 relative">
              {/* Fake Graph Bars */}
              {[42, 45, 43, 50, 55, 62, 60, 68, 72, 75, 76, 78].map((val, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${val}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className="w-full bg-gradient-to-t from-blue-900 to-blue-500 rounded-t-sm opacity-80"
                />
              ))}
              
              <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-white/30 font-mono">
                <span>Epoch 0</span>
                <span>Epoch 100</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Conclusion Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-500/5 backdrop-blur-md rounded-2xl border border-blue-500/20 p-8 text-center mt-auto"
        >
          <p className="text-xl md:text-2xl font-light leading-relaxed text-white/90">
            The multi-agent intelligence council learns to balance competing objectives. 
            Over time, <span className="font-bold text-white">PIXEL</span> effectively learns to make safer and more optimal decisions, maximizing mission success.
          </p>
          <div className="flex justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-white/50 text-sm"><Shield className="w-4 h-4 text-green-400" /> Increased Survival</div>
            <div className="flex items-center gap-2 text-white/50 text-sm"><Zap className="w-4 h-4 text-blue-400" /> Energy Optimal</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

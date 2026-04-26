import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { Rocket, Satellite, Moon, ExternalLink } from 'lucide-react';

const missions = [
  {
    id: 'falcon-9',
    name: 'Falcon 9',
    org: 'NASA / SpaceX',
    desc: 'Reusable rocket for satellite deployment and payload delivery.',
    icon: Satellite,
    color: 'from-blue-500/20 to-blue-900/20',
    borderColor: 'group-hover:border-blue-500/50'
  },
  {
    id: 'lvm3',
    name: 'LVM3',
    org: 'ISRO',
    desc: 'Heavy lift rocket engineered for lunar missions and deep space insertion.',
    icon: Moon,
    color: 'from-orange-500/20 to-red-900/20',
    borderColor: 'group-hover:border-orange-500/50'
  },
  {
    id: 'sls',
    name: 'SLS',
    org: 'NASA',
    desc: 'Super heavy-lift expendable launch vehicle for deep space exploration.',
    icon: Rocket,
    color: 'from-purple-500/20 to-indigo-900/20',
    borderColor: 'group-hover:border-purple-500/50'
  }
];

export default function MissionSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      <SpaceBackground starDensity="high" />
      
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">
            Select <span className="text-blue-500">Mission</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto font-light">
            Choose a launch profile to initialize the autonomous mission control sequence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {missions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div 
                className={`group relative h-full flex flex-col p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] ${mission.borderColor} cursor-pointer`}
                onClick={() => navigate(`/missions/${mission.id}`)}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mission.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <mission.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">{mission.name}</h2>
                  <div className="text-xs font-semibold tracking-widest text-blue-400 mb-4 uppercase">{mission.org}</div>
                  <p className="text-white/70 font-light leading-relaxed mb-8 flex-grow">
                    {mission.desc}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                    <span>Initialize Sequence</span>
                    <ExternalLink className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Launch Archive Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => navigate('/launches')}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white/60 hover:text-white hover:border-white/30 transition-all text-sm uppercase tracking-widest font-semibold hover:bg-white/10"
          >
            View Launch Archive →
          </button>
        </motion.div>
      </div>
    </div>
  );
}

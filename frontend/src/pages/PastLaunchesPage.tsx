import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, Rocket, ChevronDown, ChevronUp, AlertTriangle, Shield, Brain, Zap, Navigation, Activity, Globe2 } from 'lucide-react';

import failureData from '@/data/launch_failure_crs7.json';
import artemisData from '@/data/launch_success_artemis1.json';
import starshipData from '@/data/launch_anomaly_starship_ift3.json';

type TabType = 'past' | 'upcoming' | 'recent';

export default function PastLaunchesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('past');
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [selectedTelemetryIdx, setSelectedTelemetryIdx] = useState(0);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'past', label: 'Past Launches', count: 3 },
    { id: 'upcoming', label: 'Upcoming', count: 3 },
    { id: 'recent', label: 'Recent Activity', count: 5 }
  ];

  const upcomingMissions = [
    { id: 'ax-4', name: 'Axiom Mission 4', vehicle: 'Falcon 9', date: '2026-05-15', site: 'LC-39A, KSC', org: 'Axiom Space', status: 'SCHEDULED' },
    { id: 'chandrayaan-4', name: 'Chandrayaan-4', vehicle: 'LVM3', date: '2026-08-01', site: 'SDSC, Sriharikota', org: 'ISRO', status: 'SCHEDULED' },
    { id: 'artemis-iii', name: 'Artemis III', vehicle: 'SLS Block 1', date: '2026-09-01', site: 'LC-39B, KSC', org: 'NASA', status: 'IN PREPARATION' }
  ];

  const recentActivity = [
    { time: '2 hours ago', event: 'PIXIE AI completed pre-flight structural analysis for Axiom-4 mission', type: 'ai' },
    { time: '5 hours ago', event: 'Weather forecast updated for LC-39A — 80% favorable for May window', type: 'weather' },
    { time: '1 day ago', event: 'Falcon 9 B1081 static fire completed successfully at McGregor', type: 'test' },
    { time: '2 days ago', event: 'GRPO training epoch 847 completed — reward score 0.81 (+3.2% improvement)', type: 'training' },
    { time: '3 days ago', event: 'LVM3 S200 solid booster qualification test passed at SDSC', type: 'test' }
  ];

  const renderMissionCard = (data: any) => {
    const isSuccess = data.mission.status === 'SUCCESS';
    
    return (
      <motion.div 
        key={data.mission.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white/5 backdrop-blur-md rounded-2xl border transition-all duration-500 overflow-hidden ${
          isSuccess ? 'border-green-500/20 hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]'
        }`}
      >
        <div 
          className="p-6 cursor-pointer flex items-center justify-between group"
          onClick={() => navigate(`/launches/${data.mission.id}`)}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {isSuccess ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-red-400" />}
            </div>
            <div>
              <h3 className="text-xl font-bold">{data.mission.name}</h3>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <span>{data.mission.vehicle}</span>
                <span>•</span>
                <span>{new Date(data.mission.launch_date_utc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span>•</span>
                <span>{data.mission.organization}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {data.mission.status}
            </span>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
      <SpaceBackground starDensity="low" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Mission Control
          </button>
          <div className="text-right">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Launch Archive</h1>
            <p className="text-blue-500 font-mono text-sm">HISTORICAL TELEMETRY & AI REVIEW</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label} <span className="ml-1 text-xs opacity-50">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'past' && (
            <motion.div 
              key="past"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {renderMissionCard(starshipData)}
              {renderMissionCard(artemisData)}
              {renderMissionCard(failureData)}
            </motion.div>
          )}

          {activeTab === 'upcoming' && (
            <motion.div 
              key="upcoming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {upcomingMissions.map((m, i) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 flex items-center justify-between hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{m.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-white/50">
                        <span>{m.vehicle}</span>
                        <span>•</span>
                        <span>{m.org}</span>
                        <span>•</span>
                        <span>{m.site}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-blue-400">{m.date}</div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">{m.status}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'recent' && (
            <motion.div 
              key="recent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {recentActivity.map((a, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 flex items-start gap-4"
                >
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                    a.type === 'ai' ? 'bg-blue-500' :
                    a.type === 'weather' ? 'bg-yellow-400' :
                    a.type === 'test' ? 'bg-green-400' : 'bg-purple-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{a.event}</p>
                    <span className="text-xs text-white/30">{a.time}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation to Satellites */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 mb-8 flex justify-center"
        >
          <button 
            onClick={() => navigate('/satellites')}
            className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 text-white font-semibold tracking-widest uppercase text-sm transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          >
            Access Satellite Network 
            <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

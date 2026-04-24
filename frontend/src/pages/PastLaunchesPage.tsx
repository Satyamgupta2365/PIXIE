import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Rocket, ChevronDown, ChevronUp, AlertTriangle, Shield, Brain, Zap, Navigation, Activity } from 'lucide-react';

import successData from '@/data/launch_success_demo2.json';
import failureData from '@/data/launch_failure_crs7.json';

type TabType = 'past' | 'upcoming' | 'recent';

export default function PastLaunchesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('past');
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [selectedTelemetryIdx, setSelectedTelemetryIdx] = useState(0);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'past', label: 'Past Launches', count: 2 },
    { id: 'upcoming', label: 'Upcoming', count: 3 },
    { id: 'recent', label: 'Recent Activity', count: 5 }
  ];

  const upcomingMissions = [
    { id: 'ax-4', name: 'Axiom Mission 4', vehicle: 'Falcon 9', date: '2026-05-15', site: 'LC-39A, KSC', org: 'Axiom Space', status: 'SCHEDULED' },
    { id: 'chandrayaan-4', name: 'Chandrayaan-4', vehicle: 'LVM3', date: '2026-08-01', site: 'SDSC, Sriharikota', org: 'ISRO', status: 'SCHEDULED' },
    { id: 'artemis-iii', name: 'Artemis III', vehicle: 'SLS Block 1', date: '2026-09-01', site: 'LC-39B, KSC', org: 'NASA', status: 'IN PREPARATION' }
  ];

  const recentActivity = [
    { time: '2 hours ago', event: 'PIXEL AI completed pre-flight structural analysis for Axiom-4 mission', type: 'ai' },
    { time: '5 hours ago', event: 'Weather forecast updated for LC-39A — 80% favorable for May window', type: 'weather' },
    { time: '1 day ago', event: 'Falcon 9 B1081 static fire completed successfully at McGregor', type: 'test' },
    { time: '2 days ago', event: 'GRPO training epoch 847 completed — reward score 0.81 (+3.2% improvement)', type: 'training' },
    { time: '3 days ago', event: 'LVM3 S200 solid booster qualification test passed at SDSC', type: 'test' }
  ];

  const renderTelemetryChart = (data: any) => {
    const telemetry = data.flight_telemetry;
    const maxAlt = Math.max(...telemetry.filter((t: any) => t.altitude_km != null).map((t: any) => t.altitude_km));
    
    return (
      <div className="bg-black/40 rounded-xl p-6 border border-white/5">
        <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Altitude Profile</h4>
        <div className="flex items-end gap-1 h-40">
          {telemetry.map((point: any, i: number) => {
            if (point.altitude_km == null) return null;
            const height = (point.altitude_km / maxAlt) * 100;
            const isFailed = point.status?.includes('LOV') || point.status === 'ANOMALY' || point.status === 'MISSION LOSS';
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 1)}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
                className={`flex-1 rounded-t-sm cursor-pointer transition-opacity ${
                  isFailed ? 'bg-red-500' : 
                  selectedTelemetryIdx === i ? 'bg-blue-400' : 'bg-blue-500/60'
                } hover:opacity-100 opacity-80 min-w-[3px]`}
                onClick={() => setSelectedTelemetryIdx(i)}
                title={`T+${point.time_s}s — ${point.altitude_km} km`}
              />
            );
          })}
        </div>
        
        {/* Selected Point Details */}
        {telemetry[selectedTelemetryIdx] && (
          <motion.div 
            key={selectedTelemetryIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase">Time</div>
              <div className="font-mono text-sm">T+{telemetry[selectedTelemetryIdx].time_s}s</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase">Altitude</div>
              <div className="font-mono text-sm">{telemetry[selectedTelemetryIdx].altitude_km ?? '—'} km</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase">Velocity</div>
              <div className="font-mono text-sm">{telemetry[selectedTelemetryIdx].velocity_kmh?.toLocaleString() ?? '—'} km/h</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase">Status</div>
              <div className={`font-mono text-sm ${
                telemetry[selectedTelemetryIdx].status === 'NOMINAL' ? 'text-green-400' :
                telemetry[selectedTelemetryIdx].status === 'CAUTION' ? 'text-yellow-400' :
                telemetry[selectedTelemetryIdx].status === 'WARNING' ? 'text-orange-400' : 'text-red-400'
              }`}>{telemetry[selectedTelemetryIdx].status}</div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderAIPanel = (data: any) => (
    <div className="bg-black/40 rounded-xl p-6 border border-white/5 mt-4">
      <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-400" /> PIXEL AI Analysis
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Navigation className="w-3 h-3" /> Planner Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.planner_agent.assessment.slice(0, 120)}...</div>
          <div className="text-blue-400 font-mono text-sm">Score: {data.ai_analysis.planner_agent.trajectory_score}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Zap className="w-3 h-3" /> Resource Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.resource_agent.assessment.slice(0, 120)}...</div>
          <div className="text-green-400 font-mono text-sm">Score: {data.ai_analysis.resource_agent.fuel_efficiency_score}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Shield className="w-3 h-3" /> Risk Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.risk_agent.assessment.slice(0, 120)}...</div>
          <div className={`font-mono text-sm ${data.ai_analysis.risk_agent.risk_score > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
            Risk: {data.ai_analysis.risk_agent.risk_score}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${
        data.mission.status === 'SUCCESS' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="text-xs text-white/40 uppercase mb-2">PIXEL Verdict</div>
        <p className="text-sm text-white/90 leading-relaxed">
          {typeof data.ai_analysis.what_pixel_would_have_done === 'string' 
            ? data.ai_analysis.what_pixel_would_have_done 
            : data.ai_analysis.what_pixel_would_have_done.pre_flight}
        </p>
      </div>
    </div>
  );

  const renderMissionCard = (data: any) => {
    const isExpanded = expandedMission === data.mission.id;
    const isSuccess = data.mission.status === 'SUCCESS';
    
    return (
      <motion.div 
        key={data.mission.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white/5 backdrop-blur-md rounded-2xl border transition-all duration-500 overflow-hidden ${
          isSuccess ? 'border-green-500/20 hover:border-green-500/40' : 'border-red-500/20 hover:border-red-500/40'
        }`}
      >
        {/* Card Header */}
        <div 
          className="p-6 cursor-pointer flex items-center justify-between"
          onClick={() => setExpandedMission(isExpanded ? null : data.mission.id)}
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
            {isExpanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="border-t border-white/10"
            >
              <div className="p-6 space-y-6">
                {/* Mission Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Launch Site</div>
                    <div className="font-medium text-sm">{data.mission.launch_site.pad}</div>
                    <div className="text-xs text-white/40">{data.mission.launch_site.location}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Vehicle</div>
                    <div className="font-medium text-sm">{data.mission.vehicle}</div>
                    <div className="text-xs text-white/40">Height: {data.vehicle_specs.total_height_m}m | Mass: {(data.vehicle_specs.mass_at_liftoff_kg / 1000).toFixed(0)}t</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Weather</div>
                    <div className="font-medium text-sm">{data.weather_at_launch.temperature_celsius}°C / {data.weather_at_launch.humidity_percent}% humidity</div>
                    <div className="text-xs text-white/40">Wind: {data.weather_at_launch.wind_speed_kmh} km/h {data.weather_at_launch.wind_direction}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Objective</div>
                    <div className="font-medium text-sm line-clamp-2">{data.mission.mission_type}</div>
                    <div className="text-xs text-white/40">{data.mission.destination}</div>
                  </div>
                </div>

                {/* Failure Details (if applicable) */}
                {!isSuccess && data.failure_investigation && (
                  <div className="bg-red-500/5 rounded-xl p-6 border border-red-500/20">
                    <h4 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Failure Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-white/40 uppercase">Failure Time</div>
                        <div className="font-mono text-lg text-red-400">T+{data.mission.failure_time_s}s</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 uppercase">Failure Window</div>
                        <div className="font-mono text-lg text-red-400">{data.failure_investigation.failure_window_duration_s}s</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 uppercase">Channels Analyzed</div>
                        <div className="font-mono text-lg text-white">{data.failure_investigation.telemetry_channels_analyzed.toLocaleString()}</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{data.failure_investigation.root_cause}</p>
                  </div>
                )}

                {/* Telemetry Chart */}
                {renderTelemetryChart(data)}

                {/* AI Analysis */}
                {renderAIPanel(data)}

                {/* Major Events Timeline */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/5">
                  <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Flight Events</h4>
                  <div className="space-y-3">
                    {data.major_events.map((evt: any, i: number) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="font-mono text-xs text-white/30 w-16 shrink-0 pt-1">T+{evt.time_s}s</div>
                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                          evt.label.includes('LOV') || evt.label.includes('FAILURE') || evt.label.includes('IMPACT') ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="text-sm font-bold">{evt.label}</div>
                          <div className="text-xs text-white/50">{evt.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              {renderMissionCard(successData)}
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
      </div>
    </div>
  );
}

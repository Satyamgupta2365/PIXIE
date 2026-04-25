import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SpaceBackground from '@/components/ui/space-background';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Rocket, AlertTriangle, Shield, Brain, Zap, Navigation, Activity, Globe2 } from 'lucide-react';

import failureData from '@/data/launch_failure_crs7.json';
import artemisData from '@/data/launch_success_artemis1.json';
import starshipData from '@/data/launch_anomaly_starship_ift3.json';

const allMissions = [failureData, artemisData, starshipData];

export default function LaunchDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTelemetryIdx, setSelectedTelemetryIdx] = useState(0);

  const data = allMissions.find(m => m.mission.id === id);

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Mission Not Found</h1>
        <button onClick={() => navigate('/launches')} className="text-blue-400 hover:underline">Return to Archive</button>
      </div>
    );
  }

  const isSuccess = data.mission.status === 'SUCCESS';
  const isFailure = !isSuccess;

  const renderTelemetryChart = () => {
    const telemetry = data.flight_telemetry;
    const maxAlt = Math.max(...telemetry.filter((t: any) => t.altitude_km != null).map((t: any) => t.altitude_km));
    
    return (
      <div className="bg-black/40 rounded-xl p-6 border border-white/5">
        <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Altitude Profile</h4>
        <div className="flex items-end gap-1 h-40">
          {telemetry.map((point: any, i: number) => {
            if (point.altitude_km == null) return null;
            const height = (point.altitude_km / maxAlt) * 100;
            const failedPoint = point.status?.includes('LOV') || point.status === 'ANOMALY' || point.status === 'MISSION LOSS';
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 1)}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
                className={`flex-1 rounded-t-sm cursor-pointer transition-opacity ${
                  failedPoint ? 'bg-red-500' : 
                  selectedTelemetryIdx === i ? 'bg-blue-400' : 'bg-blue-500/60'
                } hover:opacity-100 opacity-80 min-w-[3px]`}
                onClick={() => setSelectedTelemetryIdx(i)}
                title={`T+${point.time_s}s — ${point.altitude_km} km`}
              />
            );
          })}
        </div>
        
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

  const renderAIPanel = () => (
    <div className="bg-black/40 rounded-xl p-6 border border-white/5 mt-4">
      <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-400" /> PIXEL AI Analysis
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Navigation className="w-3 h-3" /> Planner Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.planner_agent.assessment}</div>
          <div className="text-blue-400 font-mono text-sm">Score: {data.ai_analysis.planner_agent.trajectory_score}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Zap className="w-3 h-3" /> Resource Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.resource_agent.assessment}</div>
          <div className="text-green-400 font-mono text-sm">Score: {data.ai_analysis.resource_agent.fuel_efficiency_score}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-white/40 uppercase mb-2 flex items-center gap-2"><Shield className="w-3 h-3" /> Risk Agent</div>
          <div className="text-sm text-white/80 mb-2">{data.ai_analysis.risk_agent.assessment}</div>
          <div className={`font-mono text-sm ${data.ai_analysis.risk_agent.risk_score > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
            Risk: {data.ai_analysis.risk_agent.risk_score}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${
        isSuccess ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="text-xs text-white/40 uppercase mb-2">PIXEL Verdict</div>
        <p className="text-sm text-white/90 leading-relaxed">
          {typeof data.ai_analysis.what_pixel_would_have_done === 'string' 
            ? data.ai_analysis.what_pixel_would_have_done 
            : data.ai_analysis.what_pixel_would_have_done?.pre_flight || data.ai_analysis.what_pixel_would_have_done}
        </p>
      </div>
    </div>
  );

  const renderLaunchMap = () => {
    let startLat = 28.5;
    let startLng = -80.5;
    if (data.mission.launch_site.location.includes('TX')) {
      startLat = 25.9;
      startLng = -97.1;
    }

    const pathPoints = [];
    for (let i = 0; i <= 100; i += 5) {
      const lng = startLng + (i * 0.5);
      const lat = startLat - (i * 0.1) + (Math.sin(i / 10) * 2);
      const px = ((lng + 180) / 360) * 1000;
      const py = ((90 - lat) / 180) * 500;
      pathPoints.push(`${px},${py}`);
    }

    return (
      <div className="bg-[#040d1a] rounded-xl border border-white/5 relative overflow-hidden h-[400px] mt-6 shadow-2xl">
        <div className="absolute top-4 left-6 z-20 text-[10px] text-white/40 uppercase tracking-widest font-mono flex items-center gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-md">
          <Globe2 className="w-3 h-3" /> Trajectory & PIXEL Analysis Map
        </div>

        <div className="absolute inset-0">
          <svg viewBox="0 0 1000 500" className="w-full h-full" style={{ background: '#020b18' }}>
            <rect width="1000" height="500" fill="#020b18"/>
            <image href="/world.svg" x="0" y="0" width="1000" height="500" preserveAspectRatio="none" style={{ opacity: 0.5 }} />
            
            <polyline
              points={pathPoints.join(' ')}
              fill="none" stroke={isFailure ? "rgba(239,68,68,0.8)" : "rgba(34,211,238,0.8)"} strokeWidth="3"
              strokeDasharray={isFailure ? "10 5" : "none"}
            />

            <circle cx={((startLng + 180) / 360) * 1000} cy={((90 - startLat) / 180) * 500} r="5" fill="#3b82f6" />
            <circle cx={((startLng + 180) / 360) * 1000} cy={((90 - startLat) / 180) * 500} r="15" fill="none" stroke="#3b82f6" strokeWidth="1" className="animate-ping" />
            
            {isFailure && (
              <g transform={`translate(${((startLng + 20 + 180) / 360) * 1000}, ${((90 - (startLat - 2)) / 180) * 500})`}>
                <circle cx="0" cy="0" r="8" fill="#ef4444" />
                <circle cx="0" cy="0" r="20" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
                <line x1="0" y1="0" x2="-30" y2="-50" stroke="#ef4444" strokeWidth="1.5" />
                <rect x="-140" y="-80" width="180" height="30" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.5" rx="6" />
                <text x="-130" y="-60" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">⚠ ANOMALY DETECTED</text>
              </g>
            )}

            <g transform={`translate(${((startLng + 35 + 180) / 360) * 1000}, ${((90 - (startLat - 1)) / 180) * 500})`}>
              <circle cx="0" cy="0" r="6" fill="#34d399" />
              <circle cx="0" cy="0" r="15" fill="none" stroke="#34d399" strokeWidth="1.5" className="animate-pulse" />
              <line x1="0" y1="0" x2="25" y2="-40" stroke="#34d399" strokeWidth="1.5" />
              <rect x="25" y="-65" width="220" height="25" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.5" rx="6" />
              <text x="32" y="-48" fill="#6ee7b7" fontSize="11" fontFamily="monospace" fontWeight="bold">PIXEL RL OPTIMIZATION APPLIED</text>
            </g>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
      <SpaceBackground starDensity="low" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <button 
            onClick={() => navigate('/launches')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Archive
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Card */}
          <div className={`bg-white/5 backdrop-blur-md rounded-2xl border p-8 ${isSuccess ? 'border-green-500/20' : 'border-red-500/20'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isSuccess ? <CheckCircle2 className="w-8 h-8 text-green-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
                </div>
                <div>
                  <h1 className="text-4xl font-black mb-2">{data.mission.name}</h1>
                  <div className="flex items-center gap-4 text-white/50 text-base">
                    <span>{data.mission.vehicle}</span>
                    <span>•</span>
                    <span>{new Date(data.mission.launch_date_utc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span>•</span>
                    <span>{data.mission.organization}</span>
                  </div>
                </div>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {data.mission.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Launch Site</div>
              <div className="font-bold text-base">{data.mission.launch_site.pad}</div>
              <div className="text-sm text-white/50">{data.mission.launch_site.location}</div>
            </div>
            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Vehicle</div>
              <div className="font-bold text-base">{data.mission.vehicle}</div>
              <div className="text-sm text-white/50">Height: {data.vehicle_specs.total_height_m}m | Mass: {(data.vehicle_specs.mass_at_liftoff_kg / 1000).toFixed(0)}t</div>
            </div>
            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Weather</div>
              <div className="font-bold text-base">{data.weather_at_launch.temperature_celsius}°C / {data.weather_at_launch.humidity_percent}% hum</div>
              <div className="text-sm text-white/50">Wind: {data.weather_at_launch.wind_speed_kmh} km/h {data.weather_at_launch.wind_direction}</div>
            </div>
            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Objective</div>
              <div className="font-bold text-base line-clamp-1">{data.mission.mission_type}</div>
              <div className="text-sm text-white/50">{data.mission.destination}</div>
            </div>
          </div>

          {/* Failure Details */}
          {!isSuccess && data.failure_investigation && (
            <div className="bg-red-500/5 rounded-xl p-6 border border-red-500/20">
              <h4 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Failure Analysis
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-white/40 uppercase">Failure Time</div>
                  <div className="font-mono text-xl text-red-400">T+{data.mission.failure_time_s ?? 'N/A'}s</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase">Failure Window</div>
                  <div className="font-mono text-xl text-red-400">{data.failure_investigation.failure_window_duration_s}s</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase">Channels Analyzed</div>
                  <div className="font-mono text-xl text-white">{data.failure_investigation.telemetry_channels_analyzed.toLocaleString()}</div>
                </div>
              </div>
              <p className="text-base text-white/80 leading-relaxed">{data.failure_investigation.root_cause}</p>
            </div>
          )}

          {renderLaunchMap()}
          {renderAIPanel()}
          {renderTelemetryChart()}

          {/* Events */}
          <div className="bg-black/40 rounded-xl p-8 border border-white/5">
            <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-6">Flight Events Timeline</h4>
            <div className="space-y-4">
              {data.major_events.map((evt: any, i: number) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="font-mono text-sm text-white/30 w-20 shrink-0 pt-1">T+{evt.time_s}s</div>
                  <div className={`w-3 h-3 mt-1.5 rounded-full shrink-0 ${
                    evt.label.includes('LOV') || evt.label.includes('FAILURE') || evt.label.includes('IMPACT') || evt.label.includes('LOSS') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-lg font-bold text-white/90">{evt.label}</div>
                    <div className="text-sm text-white/50 mt-1">{evt.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

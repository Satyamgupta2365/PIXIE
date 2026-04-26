import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, AlertTriangle, Clock, Satellite, Zap, Activity, Globe2, ChevronRight, Target } from 'lucide-react';
import { COLLISION_HISTORY } from '@/data/collisionHistory';

export default function CollisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const c = COLLISION_HISTORY.find(ev => ev.id === id);
  if (!c) {
    return (
      <div className="h-screen w-screen bg-[#080c14] text-white flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white/50">Event not found</div>
          <button onClick={() => navigate('/satellites')} className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors">Return to Orb-Net</button>
        </div>
      </div>
    );
  }

  const sevColor = c.severity === 'CATASTROPHIC' ? 'red' : c.severity === 'HIGH' ? 'orange' : c.severity === 'NEAR-MISS' ? 'cyan' : 'yellow';

  return (
    <div className="h-screen w-screen bg-[#080c14] text-white overflow-hidden flex flex-col font-sans">

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/satellites')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Orb-Net
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xl font-black tracking-tighter">
            <span className="text-red-400">⚠</span> Collision Analysis
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-${sevColor}-500/10 border border-${sevColor}-500/30 text-${sevColor}-400 text-xs font-mono uppercase tracking-widest`}>
            <AlertTriangle className="w-3 h-3" />
            {c.severity}
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-mono uppercase tracking-widest">
            <Clock className="w-3 h-3 inline mr-1" />{c.date}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 p-4 min-h-0 overflow-hidden">

        {/* LEFT — Map + Timeline */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* Title Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight mb-2">{c.title}</h1>
                <p className="text-white/50 text-sm leading-relaxed max-w-2xl">{c.desc}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <div className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-center">
                  <div className="text-[8px] text-white/30 uppercase font-mono">Orbit</div>
                  <div className="text-sm font-bold text-cyan-400 font-mono">{c.orbit}</div>
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-center">
                  <div className="text-[8px] text-white/30 uppercase font-mono">Alt</div>
                  <div className="text-sm font-bold text-purple-400 font-mono">{c.altitude}</div>
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-center">
                  <div className="text-[8px] text-white/30 uppercase font-mono">Debris</div>
                  <div className="text-sm font-bold text-red-400 font-mono">{c.debris}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* COLLISION MAP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#040d1a] border border-red-500/20 rounded-2xl overflow-hidden relative"
            style={{ height: '320px' }}
          >
            {/* Corner marks */}
            {['tl','tr','bl','br'].map(corner => (
              <div key={corner} className={`absolute w-6 h-6 z-10 ${corner.includes('t') ? 'top-0 border-t-2' : 'bottom-0 border-b-2'} ${corner.includes('l') ? 'left-0 border-l-2 rounded-tl-2xl' : 'right-0 border-r-2 rounded-tr-2xl'} border-red-500/40`} />
            ))}

            <div className="absolute top-4 left-6 z-20 text-[10px] text-white/30 uppercase tracking-widest font-mono flex items-center gap-2">
              <Target className="w-3 h-3 text-red-400" /> Impact Location · {c.lat.toFixed(1)}°N, {c.lng.toFixed(1)}°E
            </div>

            <svg viewBox="0 0 1000 500" className="w-full h-full" style={{ background: '#020b18' }}>
              <rect width="1000" height="500" fill="#020b18"/>
              {[...Array(19)].map((_,i) => <line key={`v${i}`} x1={i*56} y1="0" x2={i*56} y2="500" stroke="rgba(59,130,246,0.06)" strokeWidth="0.5"/>)}
              {[...Array(9)].map((_,i) => <line key={`h${i}`} x1="0" y1={i*62.5} x2="1000" y2={i*62.5} stroke="rgba(59,130,246,0.06)" strokeWidth="0.5"/>)}
              <image href="/world.svg" x="0" y="0" width="1000" height="500" preserveAspectRatio="none" style={{ opacity: 0.6 }}/>
              <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" strokeDasharray="8 4"/>
              <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" strokeDasharray="8 4"/>

              {/* Debris field radius */}
              <circle
                cx={((c.lng + 180) / 360) * 1000}
                cy={((90 - c.lat) / 180) * 500}
                r="80" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="1" strokeDasharray="4 4"
              />
              <circle
                cx={((c.lng + 180) / 360) * 1000}
                cy={((90 - c.lat) / 180) * 500}
                r="45" fill="rgba(239,68,68,0.05)" stroke="rgba(239,68,68,0.3)" strokeWidth="1"
              />

              {/* Animated shockwave */}
              <circle cx={((c.lng + 180) / 360) * 1000} cy={((90 - c.lat) / 180) * 500} r="20" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.6">
                <animate attributeName="r" from="10" to="60" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx={((c.lng + 180) / 360) * 1000} cy={((90 - c.lat) / 180) * 500} r="20" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.4">
                <animate attributeName="r" from="10" to="60" dur="2s" begin="0.7s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin="0.7s" repeatCount="indefinite"/>
              </circle>

              {/* Impact point */}
              <circle cx={((c.lng + 180) / 360) * 1000} cy={((90 - c.lat) / 180) * 500} r="6" fill="#ef4444" opacity="0.9"/>
              <circle cx={((c.lng + 180) / 360) * 1000} cy={((90 - c.lat) / 180) * 500} r="3" fill="#fca5a5"/>

              {/* Label */}
              <text x={((c.lng + 180) / 360) * 1000 + 15} y={((90 - c.lat) / 180) * 500 - 12} fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">{c.title}</text>
              <text x={((c.lng + 180) / 360) * 1000 + 15} y={((90 - c.lat) / 180) * 500 + 3} fill="#fca5a5" fontSize="9" fontFamily="monospace" opacity="0.6">{c.altitude} · {c.velocity}</text>
            </svg>

            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between z-20">
              <div className="flex items-center gap-4 text-[9px] font-mono text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/> Impact Point</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-red-500/30 inline-block"/> Debris Field</span>
              </div>
              <div className="font-mono text-[9px] text-white/30">{c.date}</div>
            </div>
          </motion.div>

          {/* TIMELINE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md"
          >
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Event Timeline
            </div>
            <div className="space-y-0">
              {c.timeline.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex gap-4 items-start"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      t.status === 'critical' ? 'bg-red-400 border-red-400' :
                      t.status === 'danger' ? 'bg-orange-400 border-orange-400' :
                      t.status === 'warning' ? 'bg-yellow-400 border-yellow-400' :
                      'bg-blue-400 border-blue-400'
                    }`} />
                    {i < c.timeline.length - 1 && <div className="w-px h-8 bg-white/10" />}
                  </div>
                  <div className="pb-4 -mt-0.5">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-mono font-bold ${
                        t.status === 'critical' ? 'text-red-400' :
                        t.status === 'danger' ? 'text-orange-400' :
                        t.status === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>{t.time}</span>
                    </div>
                    <div className="text-xs text-white/60">{t.event}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT — Technical Details + PIXIE Analysis */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* Technical Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-md"
          >
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Technical Parameters
            </div>
            {c.techDetails.map((d, i) => (
              <div key={i} className="flex justify-between items-start py-2 border-b border-white/5 last:border-0">
                <span className="text-[10px] text-white/30 uppercase font-mono shrink-0 mr-2">{d.label}</span>
                <span className="text-[11px] font-mono text-white text-right">{d.value}</span>
              </div>
            ))}
          </motion.div>

          {/* PIXIE RL ANALYSIS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-blue-500/[0.03] border border-blue-500/20 rounded-2xl p-5 backdrop-blur-md flex-1"
          >
            <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2 font-bold">
              <Shield className="w-3 h-3" /> PIXIE RL Analysis
            </div>
            <p className="text-[11px] text-blue-200/60 leading-relaxed mb-5">{c.pixieAnalysis.summary}</p>

            {/* RL Steps */}
            <div className="space-y-2 mb-5">
              {c.pixieAnalysis.steps.map((step, i) => (
                <motion.button
                  key={i}
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${expandedStep === i ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:border-blue-500/20'}`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-mono font-bold text-blue-400">{i + 1}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">{step.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{step.reward}</span>
                      <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${expandedStep === i ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedStep === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="text-[10px] text-blue-200/50 leading-relaxed mt-2 pl-9 font-mono">{step.detail}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-blue-500/10">
              <div className="bg-blue-500/5 rounded-lg p-3 text-center">
                <div className="text-[8px] text-blue-400/50 uppercase font-mono mb-1">Total Reward</div>
                <div className="text-lg font-black text-green-400 font-mono">{c.pixieAnalysis.totalReward}</div>
              </div>
              <div className="bg-blue-500/5 rounded-lg p-3 text-center">
                <div className="text-[8px] text-blue-400/50 uppercase font-mono mb-1">Debris Prevented</div>
                <div className="text-[10px] font-bold text-cyan-400 font-mono leading-tight">{c.pixieAnalysis.debrisPrevented}</div>
              </div>
              <div className="bg-blue-500/5 rounded-lg p-3 text-center">
                <div className="text-[8px] text-blue-400/50 uppercase font-mono mb-1">Cost Saving</div>
                <div className="text-[10px] font-bold text-yellow-400 font-mono leading-tight">{c.pixieAnalysis.costSaving}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

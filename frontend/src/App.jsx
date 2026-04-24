import React, { useEffect, useState, Suspense, lazy } from 'react';
import './index.css';

const RoverScene = lazy(() => import('./RoverScene'));

function App() {
  const [introMode, setIntroMode]       = useState(true);
  const [eyeLooking, setEyeLooking]     = useState(false);   // rover "looks at you"
  const [contentVisible, setContentVisible] = useState(false);
  const [scrollY, setScrollY]           = useState(0);
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking]     = useState(false);
  const [roverClicked, setRoverClicked] = useState(false);   // post-intro click flash

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMove   = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    const onDown   = () => setIsClicking(true);
    const onUp     = () => setIsClicking(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Background images for content sections
  const backgrounds = ['/bg.png', '/bg-orbit.png', '/bg-galaxy.png', '/bg-nebula.png', '/bg-surface2.png'];
  const maxScroll     = typeof window !== 'undefined' ? Math.max(1, document.body.scrollHeight - window.innerHeight) : 1;
  const scrollProg    = scrollY / maxScroll;
  const activeBgIdx   = Math.min(backgrounds.length - 1, Math.floor(scrollProg * backgrounds.length));

  // ── Click-to-enter: rover "looks at you" → website opens ──────────────────
  const handleRoverClickIntro = () => {
    if (!introMode) return;
    setEyeLooking(true);           // camera mast turns to viewer + eyes glow
    setTimeout(() => {
      setIntroMode(false);
      setContentVisible(true);
    }, 1400);                      // after 1.4 s of rover looking → reveal site
  };

  // Post-intro rover poke
  const handleRoverClickMain = () => {
    setRoverClicked(true);
    setTimeout(() => setRoverClicked(false), 1000);
  };

  // Parallax: rover stays sticky-left, content scrolls — give rover slight lag
  const roverParallaxY = scrollY * 0.2;

  return (
    <>
      {/* ── CUSTOM CURSOR ─────────────────────────────────────────────── */}
      <div
        className={`cursor-follower ${isClicking ? 'clicking' : ''}`}
        style={{ left: mousePos.x, top: mousePos.y }}
      />

      {/* ── FULL-PAGE SPACE BACKGROUND (always deep black) ────────────── */}
      <div className="space-bg" />

      {/* ── CONTENT-SECTION BACKGROUNDS (after intro) ─────────────────── */}
      {!introMode && (
        <div className="bg-container">
          {backgrounds.map((bg, idx) => (
            <img key={idx} src={bg} alt=""
              className={`bg-image ${idx === activeBgIdx ? 'active' : ''}`}
              style={{ transform: `scale(${1 + scrollProg * 0.07})` }}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  3-D ROVER CANVAS — always visible, no blocking overlay        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`rover-panel ${introMode ? 'intro-full' : 'side-panel'}`}
        style={!introMode ? { transform: `translateY(${roverParallaxY}px)` } : undefined}
        onClick={introMode ? handleRoverClickIntro : handleRoverClickMain}
      >
        <Suspense fallback={<div className="rover-loading">LOADING ROVER…</div>}>
          <RoverScene
            scrollY={scrollY}
            mousePos={mousePos}
            clicked={introMode ? eyeLooking : roverClicked}
          />
        </Suspense>

        {/* Pulse rings (intro only) */}
        {introMode && !eyeLooking && (
          <div className="click-pulse-wrap">
            <div className="pulse-ring" />
            <div className="pulse-ring delay" />
          </div>
        )}

        {/* HUD (main mode) */}
        {!introMode && (
          <div className="rover-hud">
            <div className="hud-row">SYS <span className="ok">NOMINAL</span></div>
            <div className="hud-row">PWR <span className="ok">98%</span></div>
            <div className="hud-row">COMM <span className="ok">LINKED</span></div>
          </div>
        )}
      </div>

      {/* ── INTRO TEXT LAYER (transparent overlay, no background) ──────── */}
      {introMode && (
        <div className={`intro-labels ${eyeLooking ? 'fading' : ''}`}>
          <div className="intro-top">
            <div className="intro-brand">PIX<span>EL</span></div>
            <div className="intro-sub">AUTONOMOUS MARTIAN INTELLIGENCE</div>
          </div>
          <div className="intro-bottom">
            {!eyeLooking
              ? <><span className="blink-dot" /> CLICK THE ROVER TO ENTER</>
              : <><span className="eye-pulse" /> INITIATING SYSTEM…</>
            }
          </div>
        </div>
      )}

      {/* ── MAIN WEBSITE CONTENT ──────────────────────────────────────── */}
      <div className={`content-wrapper ${contentVisible ? 'visible' : ''}`}>

        <nav className="nav-bar">
          <div className="logo">PIX<span>EL</span></div>
          <div className="nav-links">
            <a href="#" className="nav-link">Mission</a>
            <a href="#" className="nav-link">Agents</a>
            <a href="#" className="nav-link">World Model</a>
          </div>
          <button className="enter-button">Connect</button>
        </nav>

        <section className="section">
          <div className="glass-panel">
            <div className="section-tag">// SYSTEM OVERVIEW</div>
            <h2>MAKING MULTI-AGENT AUTONOMY REAL</h2>
            <p>PIXEL is an advanced, phase-based autonomous space mission simulation environment.
              Train LLMs to master deep spatial-temporal reasoning and high-stakes crisis resolution.</p>
            <div className="stat-row">
              <div className="stat"><span>10</span><label>Mission Phases</label></div>
              <div className="stat"><span>3+</span><label>AI Agents</label></div>
              <div className="stat"><span>∞</span><label>Scenarios</label></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="glass-panel">
            <div className="section-tag">// MISSION LIFECYCLE</div>
            <h2>Phase-Based Mission Control</h2>
            <p>Models the entire space mission lifecycle across 10 discrete phases —
              from orbital insertion to surface operations and anomaly resolution.</p>
            <div className="phase-timeline">
              {['LAUNCH','ORBIT','DESCENT','LANDING','SURFACE OPS','ANOMALY','RECOVERY','SCIENCE','TRANSIT','MISSION END'].map((p, i) => (
                <div key={i} className="phase-dot" style={{ '--delay': `${i * 0.1}s` }}>
                  <div className="dot" /><label>{p}</label>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="glass-panel">
            <div className="section-tag">// INTELLIGENCE LAYER</div>
            <h2>Multi-Agent Intelligence</h2>
            <p>A specialized council of LLM agents — Planner, Risk Assessor, and Resource Manager —
              negotiate conflicting priorities to execute optimal actions autonomously.</p>
            <div className="agent-grid">
              {[
                { name: 'PLANNER',    icon: '🧭', desc: 'Mission sequencing & objective prioritization' },
                { name: 'RISK AGENT', icon: '⚠️',  desc: 'Threat detection & mitigation strategies' },
                { name: 'RESOURCE',   icon: '⚡',   desc: 'Power, memory & bandwidth allocation' },
              ].map((a, i) => (
                <div key={i} className="agent-card">
                  <div className="agent-icon">{a.icon}</div>
                  <div className="agent-name">{a.name}</div>
                  <div className="agent-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="glass-panel">
            <div className="section-tag">// WORLD ENGINE</div>
            <h2>Dynamic World Engine</h2>
            <p>Simulates realistic Martian constraints including sudden dust storms,
              solar efficiency drops, and unpredictable hardware anomalies.</p>
            <div className="event-list">
              {[
                ['DUST STORM',    'Solar efficiency → 12%'],
                ['COMM BLACKOUT', 'Earth relay lost 47 min'],
                ['WHEEL ANOMALY', 'FL actuator response slow'],
                ['THERMAL EVENT', 'RTG temp +18°C spike'],
              ].map(([e, d], i) => (
                <div key={i} className="event-item">
                  <span className="event-badge">!</span>
                  <div><div className="event-name">{e}</div><div className="event-detail">{d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="glass-panel" style={{ marginBottom: '20vh' }}>
            <div className="section-tag">// TELEMETRY</div>
            <h2>Live Telemetry Integration</h2>
            <p>Integrates real-time NASA DSN comms data, MEDA weather statistics,
              and HiRISE topographical datasets for extreme realism.</p>
            <div className="telemetry-grid">
              {[
                { label: 'DSN UPLINK',  value: '7.182 GHz', s: 'ok'   },
                { label: 'WIND SPEED',  value: '12.4 m/s',  s: 'ok'   },
                { label: 'SOLAR FLUX',  value: '589 W/m²',  s: 'warn' },
                { label: 'TERRAIN ALT', value: '-2.3 km',   s: 'ok'   },
              ].map((t, i) => (
                <div key={i} className={`telem-card status-${t.s}`}>
                  <div className="telem-label">{t.label}</div>
                  <div className="telem-value">{t.value}</div>
                  <div className={`telem-dot ${t.s}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

export default App;

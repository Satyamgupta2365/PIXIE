import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── Starfield ────────────────────────────────────────────────────────────────
function Stars() {
  const geo = useMemo(() => {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.05} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

// ─── Mars Terrain ─────────────────────────────────────────────────────────────
function MarsTerrain() {
  const geo = useMemo(() => {
    // Wide terrain, but not too tall in viewport — pushed back behind rover
    const g = new THREE.PlaneGeometry(32, 20, 110, 60);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const noise = (x, z) => {
      const f1 = Math.sin(x * 0.5 + z * 0.35) * 0.28;   // broad dunes
      const f2 = Math.sin(x * 1.4 - z * 0.9) * 0.12;
      const f3 = Math.sin(x * 2.8 + z * 2.2) * 0.05;
      const f4 = Math.cos(x * 0.3 - z * 0.25) * 0.16;
      return f1 + f2 + f3 + f4;
    };
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, noise(pos.getX(i), pos.getZ(i)));
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    // Terrain: pushed far back (z=-5.5), low (y=-1.4) — shows as strip at bottom third
    <mesh geometry={geo} receiveShadow position={[0, -1.4, -5.5]}>
      <meshStandardMaterial
        color="#5a1e10"
        roughness={0.97}
        metalness={0.01}
      />
    </mesh>
  );
}

// ─── Mars Horizon Gradient ────────────────────────────────────────────────────
function HorizonGlow() {
  return (
    // Thin darkening band at horizon to blend terrain into space sky
    <mesh position={[0, -0.3, -7]} rotation={[Math.PI / 12, 0, 0]}>
      <planeGeometry args={[40, 4]} />
      <meshBasicMaterial color="#100305" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

// ─── Wheel ───────────────────────────────────────────────────────────────────
function Wheel({ position, rolling }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * (rolling ? 1.8 : 0.25);
  });
  return (
    <group position={position} ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.22, 0.09, 14, 28]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.95} metalness={0.1} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.10, 0.10, 0.12, 16]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.3} metalness={0.85} />
      </mesh>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <mesh key={i}
          position={[Math.cos(deg * Math.PI / 180) * 0.12, Math.sin(deg * Math.PI / 180) * 0.12, 0]}
          rotation={[0, 0, deg * Math.PI / 180]}
        >
          <boxGeometry args={[0.025, 0.18, 0.04]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Solar Panel ─────────────────────────────────────────────────────────────
function SolarPanel({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.01, 0.46]} />
        <meshStandardMaterial color="#182050" roughness={0.15} metalness={0.9} emissive="#0a1535" emissiveIntensity={0.4} />
      </mesh>
      {[-0.24, 0, 0.24].map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0.007, 0]}>
          <boxGeometry args={[0.004, 0.001, 0.44]} />
          <meshStandardMaterial color="#2a4a8a" />
        </mesh>
      ))}
      {[-0.18, 0, 0.18].map((z, i) => (
        <mesh key={`h${i}`} position={[0, 0.007, z]}>
          <boxGeometry args={[0.70, 0.001, 0.004]} />
          <meshStandardMaterial color="#2a4a8a" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Camera Mast (with "look at player" state) ────────────────────────────────
function CameraMast({ position, lookAtPlayer, eyeGlow }) {
  const mastRef = useRef();
  const targetRotY = useRef(0);

  useFrame((_, delta) => {
    if (!mastRef.current) return;
    const target = lookAtPlayer ? 0.55 : 0; // tilt mast toward camera
    mastRef.current.rotation.y += (target - mastRef.current.rotation.y) * 0.06;
  });

  return (
    <group position={position} ref={mastRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.55, 8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.4} metalness={0.8} />
      </mesh>
      <group position={[0, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.1, 0.1]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.3} metalness={0.9} />
        </mesh>
        {/* Lenses */}
        <mesh position={[-0.04, 0, 0.055]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.04, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>
        <mesh position={[0.04, 0, 0.055]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.04, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Glowing eyes */}
        <mesh position={[-0.04, 0, 0.078]}>
          <circleGeometry args={[0.016, 12]} />
          <meshStandardMaterial
            color={lookAtPlayer ? '#ff6600' : '#ff2200'}
            emissive={lookAtPlayer ? '#ff6600' : '#ff2200'}
            emissiveIntensity={lookAtPlayer ? 8 : 3}
          />
        </mesh>
        <mesh position={[0.04, 0, 0.078]}>
          <circleGeometry args={[0.016, 12]} />
          <meshStandardMaterial
            color={lookAtPlayer ? '#ff6600' : '#ff2200'}
            emissive={lookAtPlayer ? '#ff6600' : '#ff2200'}
            emissiveIntensity={lookAtPlayer ? 8 : 3}
          />
        </mesh>
        {/* Extra glow sphere on click */}
        {lookAtPlayer && (
          <mesh position={[0, 0, 0.06]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#ff4400" transparent opacity={0.18} emissive="#ff4400" emissiveIntensity={2} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ─── Robotic Arm ─────────────────────────────────────────────────────────────
function RoboticArm({ position }) {
  const t = useRef(0);
  const armRef = useRef();
  useFrame((_, delta) => {
    t.current += delta;
    if (armRef.current) armRef.current.rotation.x = Math.sin(t.current * 0.6) * 0.18;
  });
  return (
    <group position={position} ref={armRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.28, 0]} castShadow>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshStandardMaterial color="#7a7a8a" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Main Rover Mesh ─────────────────────────────────────────────────────────
function RoverMesh({ scrollY, mousePos, clicked, rolling }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const time = useRef(0);

  useFrame((state, delta) => {
    time.current += delta;
    if (!groupRef.current) return;

    // Mouse tilt (hover effect)
    const nx = (mousePos.x / window.innerWidth - 0.5) * 2;
    const ny = (mousePos.y / window.innerHeight - 0.5) * 2;
    const targetRotY = nx * 0.3;
    const targetRotX = -ny * 0.12;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.04;
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.04;

    // Gentle idle yaw drift
    groupRef.current.rotation.y += delta * 0.06;

    // Suspension idle + scroll bump
    const scrollBump = Math.abs(Math.sin(scrollY * 0.008)) * 0.05;
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(time.current * 1.1) * 0.018 + scrollBump;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      <group ref={bodyRef}>
        {/* CHASSIS — bright metallic silver-grey, clearly NASA-rover style */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
          <boxGeometry args={[0.9, 0.18, 0.58]} />
          <meshStandardMaterial color="#8a8a98" roughness={0.25} metalness={0.88} envMapIntensity={1.2} />
        </mesh>
        {/* Chassis ribs */}
        {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
          <mesh key={i} position={[x, -0.02, 0]} castShadow>
            <boxGeometry args={[0.04, 0.14, 0.56]} />
            <meshStandardMaterial color="#686878" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
        {/* TOP DECK */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.82, 0.06, 0.52]} />
          <meshStandardMaterial color="#909098" roughness={0.18} metalness={0.95} />
        </mesh>

        {/* Antenna */}
        <group position={[-0.22, 0.32, -0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.005, 0.005, 0.18, 6]} />
            <meshStandardMaterial color="#8888a0" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 3, 0, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#aaaabc" roughness={0.08} metalness={0.96} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Solar Panels */}
        <SolarPanel position={[0.56, 0.26, 0]} rotation={[0, 0, 0.14]} />
        <SolarPanel position={[-0.56, 0.26, 0]} rotation={[0, 0, -0.14]} />

        {/* Camera Mast */}
        <CameraMast position={[0.25, 0.24, -0.15]} lookAtPlayer={clicked} eyeGlow={clicked} />

        {/* Robotic Arm */}
        <RoboticArm position={[0.38, 0.06, 0.24]} />

        {/* RTG */}
        <mesh position={[-0.42, 0.1, 0.12]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.28, 12]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.4} metalness={0.85} />
        </mesh>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <mesh key={i}
            position={[-0.42 + Math.cos(deg * Math.PI / 180) * 0.075, 0.1, 0.12 + Math.sin(deg * Math.PI / 180) * 0.075]}
            rotation={[0, deg * Math.PI / 180, 0]}
          >
            <boxGeometry args={[0.04, 0.24, 0.012]} />
            <meshStandardMaterial color="#2a2a32" roughness={0.5} metalness={0.9} />
          </mesh>
        ))}

        {/* 6 WHEELS */}
        <Wheel position={[0.38, -0.12, 0.36]}  rolling={rolling} />
        <Wheel position={[0.38, -0.12, -0.36]} rolling={rolling} />
        <Wheel position={[0,    -0.15, 0.38]}  rolling={rolling} />
        <Wheel position={[0,    -0.15, -0.38]} rolling={rolling} />
        <Wheel position={[-0.38,-0.12, 0.36]}  rolling={rolling} />
        <Wheel position={[-0.38,-0.12,-0.36]}  rolling={rolling} />

        {/* Rocker bogie arms */}
        {[0.375, -0.375].map((z, i) => (
          <React.Fragment key={i}>
            <mesh position={[0.19, -0.07, z]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.42, 0.035, 0.028]} />
              <meshStandardMaterial color="#5a5a68" roughness={0.5} metalness={0.8} />
            </mesh>
            <mesh position={[-0.19, -0.07, z]} rotation={[0, 0, 0.15]} castShadow>
              <boxGeometry args={[0.42, 0.035, 0.028]} />
              <meshStandardMaterial color="#5a5a68" roughness={0.5} metalness={0.8} />
            </mesh>
          </React.Fragment>
        ))}

        {/* Status lights */}
        <mesh position={[0.46, 0.17, 0.28]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial emissive="#00ff88" emissiveIntensity={5} color="#00ff88" />
        </mesh>
        <mesh position={[0.46, 0.17, 0.16]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial emissive="#ff8800" emissiveIntensity={4} color="#ff8800" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Lights ───────────────────────────────────────────────────────────────────
function SceneLights({ clicked }) {
  return (
    <>
      {/* Key: warm solar — main light, bright enough to see rover details */}
      <directionalLight
        position={[3, 5, 3]} intensity={4.0} color="#ffe0b0"
        castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-near={0.5} shadow-camera-far={20}
        shadow-camera-left={-3} shadow-camera-right={3}
        shadow-camera-top={3} shadow-camera-bottom={-3}
      />
      {/* Secondary front fill — ensures rover body is bright and visible */}
      <directionalLight position={[0, 2, 5]} intensity={2.2} color="#d8e8ff" />
      {/* Side fill: warm */}
      <directionalLight position={[-4, 2, 1]} intensity={1.0} color="#ffb060" />
      {/* Ambient — moderate so rover isn't just a black silhouette */}
      <ambientLight intensity={0.55} color="#1a1228" />
      {/* Mars ground bounce — subtle so terrain doesn't flood the scene */}
      <pointLight position={[0, -0.6, 0.8]} intensity={0.6} color="#c03800" distance={4} />
      {/* Eye glow when clicked */}
      {clicked && <pointLight position={[0.3, 0.65, 0.8]} intensity={3} color="#ff5500" distance={2} />}
    </>
  );
}

// ─── Camera animation on click ────────────────────────────────────────────────
function CameraController({ clicked }) {
  const { camera } = useThree();
  const zoomRef = useRef(5.0);

  useFrame((_, delta) => {
    const target = clicked ? 3.0 : 5.0;
    zoomRef.current += (target - zoomRef.current) * 0.05;
    camera.position.z = zoomRef.current;
    camera.updateProjectionMatrix();
  });
  return null;
}

// ─── Exported scene ───────────────────────────────────────────────────────────
export default function RoverScene({ scrollY, mousePos, clicked }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.4, 5.0], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      {/* Very subtle far fog — just slightly darkens extreme background */}
      <fog attach="fog" args={['#090205', 15, 45]} />
      <Stars />
      <MarsTerrain />
      <HorizonGlow />
      <SceneLights clicked={clicked} />
      <CameraController clicked={clicked} />
      <Float speed={0.9} rotationIntensity={0.05} floatIntensity={0.18} floatingRange={[-0.03, 0.03]}>
        <RoverMesh scrollY={scrollY} mousePos={mousePos} clicked={clicked} rolling={false} />
      </Float>
      <ContactShadows
        position={[0, -0.87, 0]}
        opacity={0.55}
        scale={3.5}
        blur={2}
        far={1.0}
        color="#000"
      />
    </Canvas>
  );
}

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

/* ── Mars Sky ───────────────────────────────────────────────────────────── */
function MarsSky() {
  return (
    <mesh scale={[-1,1,1]}>
      <sphereGeometry args={[70,32,16]} />
      <shaderMaterial side={THREE.BackSide}
        uniforms={{ top:{value:new THREE.Color('#080306')}, mid:{value:new THREE.Color('#b86030')}, bot:{value:new THREE.Color('#7a2a10')} }}
        vertexShader={`varying vec3 vP; void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`uniform vec3 top,mid,bot;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=h>0.?mix(mid,top,pow(h,.5)):mix(mid,bot,min(1.,-h*3.));gl_FragColor=vec4(c,1.);}`}
      />
    </mesh>
  );
}

/* ── Stars ──────────────────────────────────────────────────────────────── */
function Stars() {
  const ref = useRef();
  const geo = useMemo(() => {
    const p = new Float32Array(400*3);
    for(let i=0;i<400;i++){
      const phi=Math.random()*Math.PI*.45+.05, th=Math.random()*Math.PI*2, r=65;
      p[i*3]=r*Math.sin(phi)*Math.cos(th); p[i*3+1]=r*Math.cos(phi); p[i*3+2]=r*Math.sin(phi)*Math.sin(th);
    }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); return g;
  },[]);
  useFrame(({clock})=>{ if(ref.current) ref.current.material.opacity=.15+Math.sin(clock.getElapsedTime()*.5)*.08; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#ffe8cc" size={.18} sizeAttenuation transparent opacity={.2}/></points>;
}

/* ── Terrain ────────────────────────────────────────────────────────────── */
function MarsTerrain() {
  const geo = useMemo(()=>{
    const g=new THREE.PlaneGeometry(80,50,180,90); g.rotateX(-Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i);
      p.setY(i,-((x*x+z*z)*.0018)+Math.sin(x*.3+z*.2)*.5+Math.sin(x*.8-z*.6)*.2+Math.cos(x*.15-z*.1)*.6+Math.sin(x*3+z*2.5)*.04);
    }
    g.computeVertexNormals(); return g;
  },[]);
  return <mesh geometry={geo} receiveShadow position={[0,-1.7,-4]}><meshStandardMaterial color="#c04e1a" roughness={.93} metalness={0}/></mesh>;
}

/* ── Rocks ──────────────────────────────────────────────────────────────── */
function Rocks() {
  const rocks = useMemo(()=>Array.from({length:18},(_,i)=>({
    pos:[(Math.random()-.5)*18,(Math.random()*.1-.15),(Math.random()-.5)*12-3],
    s:[.08+Math.random()*.35,.06+Math.random()*.2,.07+Math.random()*.3],
    r:[0,Math.random()*Math.PI,0]
  })),[]);
  return <>{rocks.map((r,i)=><mesh key={i} position={r.pos} scale={r.s} rotation={r.r} castShadow receiveShadow><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={`hsl(${15+Math.random()*10},60%,${22+i%3*4}%)`} roughness={.95} metalness={0}/></mesh>)}</>;
}

/* ── Wheel ──────────────────────────────────────────────────────────────── */
function Wheel({position}){
  const ref=useRef();
  useFrame((_,d)=>{ if(ref.current) ref.current.rotation.z+=d*.055; });
  return (
    <group position={position}>
      <group ref={ref} rotation={[Math.PI/2,0,0]}>
        <mesh castShadow><torusGeometry args={[.265,.032,3,52]}/><meshStandardMaterial color="#c8c8c8" roughness={.3} metalness={.9}/></mesh>
        <mesh castShadow><cylinderGeometry args={[.232,.232,.19,32]}/><meshStandardMaterial color="#aaaaaa" roughness={.4} metalness={.85}/></mesh>
        {Array.from({length:22},(_,i)=>{
          const a=(i/22)*Math.PI*2, even=i%2===0;
          return <mesh key={i} position={[Math.cos(a)*.256,Math.sin(a)*.256,0]} rotation={[0,0,a]}><boxGeometry args={[.04,.022,even?.17:.13]}/><meshStandardMaterial color="#999" roughness={.6} metalness={.7}/></mesh>;
        })}
        <mesh castShadow><cylinderGeometry args={[.055,.055,.21,10]}/><meshStandardMaterial color="#787878" roughness={.25} metalness={.95}/></mesh>
        {[0,72,144,216,288].map((d,i)=><mesh key={i} position={[Math.cos(d*Math.PI/180)*.14,Math.sin(d*Math.PI/180)*.14,0]} rotation={[0,0,d*Math.PI/180]}><boxGeometry args={[.012,.24,.01]}/><meshStandardMaterial color="#909090" roughness={.4} metalness={.88}/></mesh>)}
      </group>
    </group>
  );
}

/* ── Camera Mast ────────────────────────────────────────────────────────── */
function CameraMast({position,lookAt}){
  const ref=useRef();
  useFrame((_,d)=>{ if(ref.current) ref.current.rotation.y+=(( lookAt?.55:0)-ref.current.rotation.y)*.06; });
  return (
    <group position={position} ref={ref}>
      <mesh castShadow><cylinderGeometry args={[.022,.028,.62,8]}/><meshStandardMaterial color="#a0a0a8" roughness={.3} metalness={.88}/></mesh>
      <group position={[0,.38,0]}>
        <mesh castShadow><boxGeometry args={[.18,.13,.13]}/><meshStandardMaterial color="#3a3a48" roughness={.2} metalness={.92}/></mesh>
        {[-0.05,0.05].map((x,i)=><mesh key={i} position={[x,0,.075]}><circleGeometry args={[.02,12]}/><meshStandardMaterial color={lookAt?'#ff6600':'#ff2200'} emissive={lookAt?'#ff6600':'#ff2200'} emissiveIntensity={lookAt?10:4}/></mesh>)}
        <mesh position={[0,.09,0]} castShadow><boxGeometry args={[.08,.06,.06]}/><meshStandardMaterial color="#c8a028" roughness={.1} metalness={.9}/></mesh>
      </group>
    </group>
  );
}

/* ── Robotic Arm ────────────────────────────────────────────────────────── */
function RoboticArm({position}){
  const t=useRef(0), ref=useRef();
  useFrame((_,d)=>{ t.current+=d; if(ref.current) ref.current.rotation.x=Math.sin(t.current*.5)*.18; });
  return (
    <group position={position} ref={ref} rotation={[.3,0,.15]}>
      <mesh castShadow><cylinderGeometry args={[.018,.018,.48,8]}/><meshStandardMaterial color="#909098" roughness={.4} metalness={.8}/></mesh>
      <mesh position={[0,-.28,0]} castShadow><cylinderGeometry args={[.035,.022,.16,8]}/><meshStandardMaterial color="#c8a028" roughness={.1} metalness={.92}/></mesh>
      <mesh position={[0,-.38,0]} castShadow><cylinderGeometry args={[.04,.04,.06,10]}/><meshStandardMaterial color="#2a2a32" roughness={.3} metalness={.9}/></mesh>
    </group>
  );
}

/* ── Rotating Dish ──────────────────────────────────────────────────────── */
function Dish({position}){
  const ref=useRef();
  useFrame((_,d)=>{ if(ref.current) ref.current.rotation.y+=d*.35; });
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[.006,.006,.2,6]}/><meshStandardMaterial color="#a0a0b0" roughness={.4} metalness={.85}/></mesh>
      <group ref={ref} position={[0,.14,0]}>
        <mesh castShadow rotation={[-Math.PI/2.8,0,0]}><sphereGeometry args={[.12,14,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#c8c8d8" roughness={.05} metalness={.97} side={THREE.DoubleSide}/></mesh>
      </group>
    </group>
  );
}

/* ── MMRTG (nuclear generator) ──────────────────────────────────────────── */
function MMRTG({position}){
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[.065,.065,.38,12]}/><meshStandardMaterial color="#282830" roughness={.35} metalness={.88}/></mesh>
      {[0,45,90,135,180,225,270,315].map((d,i)=><mesh key={i} position={[Math.cos(d*Math.PI/180)*.085,0,Math.sin(d*Math.PI/180)*.085]} rotation={[0,d*Math.PI/180,0]} castShadow><boxGeometry args={[.045,.32,.012]}/><meshStandardMaterial color="#1e1e28" roughness={.5} metalness={.9}/></mesh>)}
    </group>
  );
}

/* ── Blinking Light ─────────────────────────────────────────────────────── */
function BLink({position,color,speed}){
  const ref=useRef();
  useFrame(({clock})=>{ if(ref.current) ref.current.material.emissiveIntensity=3+Math.sin(clock.getElapsedTime()*speed)*2.5; });
  return <mesh ref={ref} position={position}><sphereGeometry args={[.016,8,8]}/><meshStandardMaterial emissive={color} emissiveIntensity={5} color={color}/></mesh>;
}

/* ── Full Rover ─────────────────────────────────────────────────────────── */
function Rover({scrollY,mousePos,clicked}){
  const gRef=useRef(), bRef=useRef(), t=useRef(0);
  useFrame((_,d)=>{
    t.current+=d;
    if(!gRef.current) return;
    const nx=(mousePos.x/window.innerWidth-.5)*2, ny=(mousePos.y/window.innerHeight-.5)*2;
    gRef.current.rotation.y+=(nx*.25-gRef.current.rotation.y)*.03;
    gRef.current.rotation.x+=(-ny*.09-gRef.current.rotation.x)*.03;
    gRef.current.rotation.y+=d*.04;
    if(bRef.current) bRef.current.position.y=Math.sin(t.current*.85)*.015;
  });

  return (
    <group ref={gRef} position={[0,.05,0]}>
      <group ref={bRef}>
        {/* Main chassis */}
        <mesh castShadow receiveShadow position={[0,.1,0]}><boxGeometry args={[1.1,.22,.65]}/><meshStandardMaterial color="#b0b0b8" roughness={.2} metalness={.9} envMapIntensity={1.4}/></mesh>
        {/* Gold MLI thermal blanket panels */}
        <mesh castShadow position={[0,.1,.34]}><boxGeometry args={[.9,.2,.01]}/><meshStandardMaterial color="#c8a028" roughness={.08} metalness={.95}/></mesh>
        <mesh castShadow position={[0,.1,-.34]}><boxGeometry args={[.9,.2,.01]}/><meshStandardMaterial color="#c8a028" roughness={.08} metalness={.95}/></mesh>
        <mesh castShadow position={[.56,.1,0]}><boxGeometry args={[.01,.2,.63]}/><meshStandardMaterial color="#c8a028" roughness={.08} metalness={.95}/></mesh>
        {/* Top deck */}
        <mesh castShadow position={[0,.23,0]}><boxGeometry args={[1.05,.055,.60]}/><meshStandardMaterial color="#c8c8d4" roughness={.15} metalness={.96}/></mesh>
        {/* Top equipment boxes */}
        <mesh castShadow position={[-.18,.29,.08]}><boxGeometry args={[.28,.07,.2]}/><meshStandardMaterial color="#888898" roughness={.3} metalness={.85}/></mesh>
        <mesh castShadow position={[.2,.29,-.1]}><boxGeometry args={[.22,.06,.18]}/><meshStandardMaterial color="#c8a028" roughness={.1} metalness={.92}/></mesh>
        {/* Front bumper */}
        <mesh castShadow position={[.57,-.01,0]}><boxGeometry args={[.055,.14,.63]}/><meshStandardMaterial color="#787888" roughness={.4} metalness={.82}/></mesh>
        {/* Chassis ribs */}
        {[-0.3,-0.1,0.1,0.3].map((x,i)=><mesh key={i} position={[x,-.02,0]} castShadow><boxGeometry args={[.04,.16,.63]}/><meshStandardMaterial color="#686878" roughness={.5} metalness={.75}/></mesh>)}
        {/* Rocker-bogie arms */}
        {[.37,-.37].map((z,i)=>(
          <React.Fragment key={i}>
            <mesh position={[.18,-.09,z]} rotation={[0,0,-.18]} castShadow><boxGeometry args={[.46,.038,.028]}/><meshStandardMaterial color="#585868" roughness={.5} metalness={.82}/></mesh>
            <mesh position={[-.18,-.09,z]} rotation={[0,0,.18]} castShadow><boxGeometry args={[.46,.038,.028]}/><meshStandardMaterial color="#585868" roughness={.5} metalness={.82}/></mesh>
          </React.Fragment>
        ))}
        {/* 6 Wheels */}
        <Wheel position={[ .38,-.15, .37]}/><Wheel position={[ .38,-.15,-.37]}/>
        <Wheel position={[  0,-.18, .39]}/><Wheel position={[  0,-.18,-.39]}/>
        <Wheel position={[-.38,-.15, .37]}/><Wheel position={[-.38,-.15,-.37]}/>
        {/* Mast */}
        <CameraMast position={[.12,.26,-.18]} lookAt={clicked}/>
        {/* Dish antenna */}
        <Dish position={[-.22,.3,-.15]}/>
        {/* Robotic arm */}
        <RoboticArm position={[.52,.08,.22]}/>
        {/* MMRTG */}
        <MMRTG position={[-.52,.09,.08]}/>
        {/* Status lights */}
        <BLink position={[.58,.17,.28]} color="#00ff88" speed={1.8}/>
        <BLink position={[.58,.17,.12]} color="#ff8800" speed={2.6}/>
        <BLink position={[.58,.17,-.04]} color="#4488ff" speed={.9}/>
        {/* UHF low-gain antenna stub */}
        <mesh castShadow position={[-.4,.32,.12]}><cylinderGeometry args={[.008,.008,.16,6]}/><meshStandardMaterial color="#909090" roughness={.4} metalness={.85}/></mesh>
        <mesh castShadow position={[-.4,.41,.12]}><sphereGeometry args={[.022,8,8]}/><meshStandardMaterial color="#a0a0a8" roughness={.2} metalness={.9}/></mesh>
      </group>
    </group>
  );
}

/* ── Lights ─────────────────────────────────────────────────────────────── */
function Lights({clicked}){
  const rimRef=useRef();
  useFrame(({clock})=>{ if(rimRef.current) rimRef.current.intensity=1.2+Math.sin(clock.getElapsedTime()*.4)*.3; });
  return (
    <>
      <directionalLight position={[5,8,4]} intensity={5} color="#ffd080" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={.5} shadow-camera-far={30} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5}/>
      <directionalLight position={[0,3,6]} intensity={1.8} color="#ffb870"/>
      <directionalLight ref={rimRef} position={[-6,3,-2]} intensity={1.2} color="#ff7030"/>
      <ambientLight intensity={.55} color="#3a1808"/>
      <pointLight position={[0,-.4,1]} intensity={1.5} color="#cc4400" distance={6}/>
      {clicked&&<pointLight position={[.2,.65,.8]} intensity={4} color="#ff5500" distance={3}/>}
    </>
  );
}

/* ── Dust ───────────────────────────────────────────────────────────────── */
function Dust(){
  const ref=useRef();
  const geo=useMemo(()=>{
    const p=new Float32Array(80*3);
    for(let i=0;i<80;i++){p[i*3]=(Math.random()-.5)*10;p[i*3+1]=Math.random()*1.2-1;p[i*3+2]=(Math.random()-.5)*5;}
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); return g;
  },[]);
  useFrame(({clock})=>{ if(ref.current){ref.current.rotation.y=clock.getElapsedTime()*.015; ref.current.material.opacity=.12+Math.sin(clock.getElapsedTime()*.25)*.06;} });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#c06020" size={.05} sizeAttenuation transparent opacity={.15}/></points>;
}

/* ── Camera ─────────────────────────────────────────────────────────────── */
function Cam({clicked,mousePos}){
  const {camera}=useThree(), z=useRef(4.8);
  useFrame((_,d)=>{
    z.current+=(( clicked?3.0:4.8)-z.current)*.05;
    camera.position.z=z.current;
    const nx=mousePos.x/window.innerWidth-.5, ny=mousePos.y/window.innerHeight-.5;
    camera.position.x+=(-nx*.35-camera.position.x)*.02;
    camera.position.y+=(1.3+ny*.2-camera.position.y)*.02;
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ── Horizon glow ───────────────────────────────────────────────────────── */
function Horizon(){
  return (
    <>
      <mesh position={[0,-.4,-7]} rotation={[Math.PI/16,0,0]}><planeGeometry args={[60,4]}/><meshBasicMaterial color="#7a2a08" transparent opacity={.6} depthWrite={false}/></mesh>
      <mesh position={[0,-.1,-9]} rotation={[Math.PI/24,0,0]}><planeGeometry args={[60,3]}/><meshBasicMaterial color="#b04015" transparent opacity={.25} depthWrite={false}/></mesh>
    </>
  );
}

/* ── Scene ──────────────────────────────────────────────────────────────── */
export default function RoverScene({scrollY,mousePos,clicked}){
  return (
    <Canvas shadows camera={{position:[0,1.3,4.8],fov:38}}
      gl={{antialias:true,alpha:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.15}}
      style={{background:'transparent',width:'100%',height:'100%'}}>
      <fog attach="fog" args={['#7a3010',20,65]}/>
      <MarsSky/>
      <Stars/>
      <MarsTerrain/>
      <Rocks/>
      <Dust/>
      <Horizon/>
      <Lights clicked={clicked}/>
      <Cam clicked={clicked} mousePos={mousePos}/>
      <Float speed={.75} rotationIntensity={.035} floatIntensity={.12} floatingRange={[-.02,.02]}>
        <Rover scrollY={scrollY} mousePos={mousePos} clicked={clicked}/>
      </Float>
      <ContactShadows position={[0,-.9,0]} opacity={.75} scale={5} blur={2.5} far={1.3} color="#220800"/>
    </Canvas>
  );
}

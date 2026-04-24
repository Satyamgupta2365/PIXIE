import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERT = `varying vec3 vN;varying vec2 vU;
void main(){vN=normalize(normalMatrix*normal);vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

const FRAG = `varying vec3 vN;varying vec2 vU;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float sn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*sn(p);p*=2.1;a*=.5;}return v;}
void main(){
  vec2 uv=vU*vec2(6.,3.);
  float f=fbm(uv),f2=fbm(uv*1.8+3.7),f3=fbm(uv*.5+1.3);
  vec3 base=vec3(.72,.27,.09),lt=vec3(.86,.46,.17),dk=vec3(.36,.12,.04),sand=vec3(.80,.50,.20);
  vec3 col=mix(dk,base,f);col=mix(col,lt,f2*.45);col=mix(col,sand,f3*.28);
  float pole=smoothstep(.76,1.,abs(vN.y));col=mix(col,vec3(.93,.91,.89),pole);
  vec3 L=normalize(vec3(2.2,.4,1.8));float d=max(0.,dot(vN,L));
  col*=.07+d*.93;
  float rim=pow(1.-max(0.,dot(vN,vec3(0,0,1))),3.2);
  col+=rim*vec3(.9,.28,.08)*.28;
  gl_FragColor=vec4(col,1.);
}`;

function Stars() {
  const ref = useRef();
  const geo = useMemo(() => {
    const p = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const phi = Math.acos(2 * Math.random() - 1), th = Math.random() * Math.PI * 2, r = 30;
      p[i*3]=r*Math.sin(phi)*Math.cos(th); p[i*3+1]=r*Math.cos(phi); p[i*3+2]=r*Math.sin(phi)*Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.material.opacity = .4 + Math.sin(clock.getElapsedTime() * .7) * .2; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#ffffff" size={.12} sizeAttenuation transparent opacity={.5} /></points>;
}

function Planet() {
  const planet = useRef(), atmo = useRef();
  useFrame((_, d) => {
    if (planet.current) planet.current.rotation.y += d * .055;
    if (atmo.current)   atmo.current.rotation.y   += d * .035;
  });
  return (
    <>
      <Stars />
      <mesh ref={planet}>
        <sphereGeometry args={[2.0, 96, 96]} />
        <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} />
      </mesh>
      <mesh ref={atmo} scale={1.055}>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial color="#dd5018" transparent opacity={.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <directionalLight position={[6, 1, 4]} intensity={2.8} color="#ffd080" />
      <ambientLight intensity={.07} color="#ff3a08" />
    </>
  );
}

export default function MarsPlanet() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Planet />
    </Canvas>
  );
}

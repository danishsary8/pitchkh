"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildFieldScene, defaultCameraPosition, type FieldSceneOptions } from "./scene";

function Scene({ options, onReady }: { options: FieldSceneOptions; onReady: () => void }) {
  const built = useMemo(() => buildFieldScene(options), [options]);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    onReady();
    return () => built.dispose();
  }, [built, onReady]);

  return (
    <>
      <color attach="background" args={[built.background]} />
      <fog attach="fog" args={[built.background, built.radius * 4, built.radius * 13]} />
      <PerspectiveCamera makeDefault fov={38} near={0.5} far={built.radius * 40} position={defaultCameraPosition(built.radius)} />
      <primitive object={built.root} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={spinning}
        autoRotateSpeed={0.6}
        onStart={() => setSpinning(false)}
        minDistance={built.radius * 0.7}
        maxDistance={built.radius * 4.5}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

/** The WebGL canvas. Loaded on demand only: three.js never ships in the first page load. */
export default function FieldCanvas({ options, onReady }: { options: FieldSceneOptions; onReady: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Stop rendering when scrolled off screen to save battery.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const high = options.quality !== "low";
  return (
    <div ref={ref} className="absolute inset-0 touch-none">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={high ? [1, 1.75] : [1, 1.25]}
        shadows={high ? "soft" : false}
        gl={{ antialias: high, powerPreference: high ? "high-performance" : "low-power" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = options.time === "night" ? 1.25 : 1.05;
        }}
      >
        <Scene options={options} onReady={onReady} />
      </Canvas>
    </div>
  );
}

"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pet3D, type PetVariant } from "@/components/cozy/Pet3D";

/** Lắc qua lại quanh góc chính diện — luôn ngắm được mặt nhân vật. */
function SlowSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // Góc nền ~0.6 rad hướng mặt về phía camera (2.1, 1.7, 2.5), lắc ±17° quanh đó.
    if (ref.current) ref.current.rotation.y = 0.6 + Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
  });
  return <group ref={ref}>{children}</group>;
}

/** Sân khấu mini: pet 3D đứng trên đế tròn, sáng ấm kiểu cozy. */
export function IdentityPreview3D({ variant }: { variant: PetVariant }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [1.7, 1.5, 2.6], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
      onCreated={({ camera }) => camera.lookAt(0, 0.72, 0)}
    >
      <ambientLight intensity={0.55} color="#FFF4E0" />
      <directionalLight position={[4, 6, 4]} intensity={1.15} color="#FFEDC8" />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#BCD9FF" />
      <SlowSpin>
        <Pet3D variant={variant} scale={1.08} />
      </SlowSpin>
      {/* Đế tròn pastel */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.12, 28]} />
        <meshStandardMaterial color="#EAD9BE" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 28]} />
        <meshStandardMaterial color="#F7E8C8" roughness={0.95} flatShading />
      </mesh>
    </Canvas>
  );
}

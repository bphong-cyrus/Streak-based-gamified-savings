"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Pet3D, type PetVariant } from "@/components/cozy/Pet3D";

/**
 * Ảnh thu nhỏ nhân vật 3D cho lưới chọn — mỗi ô là một canvas riêng nhưng
 * frameloop="demand" nên chỉ vẽ 1 khung tĩnh (không ngốn CPU/GPU liên tục).
 */
export function PetThumb3D({ variant }: { variant: PetVariant }) {
  return (
    <Canvas
      dpr={1}
      frameloop="demand"
      camera={{ position: [1.2, 1.2, 2.05], fov: 34 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      style={{ background: "transparent" }}
      onCreated={({ camera, scene }) => {
        camera.lookAt(0, 0.78, 0);
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) o.updateMatrixWorld();
        });
      }}
    >
      <ambientLight intensity={0.7} color="#FFF4E0" />
      <directionalLight position={[3, 4, 3]} intensity={1.1} color="#FFEDC8" />
      <Pet3D variant={variant} scale={0.92} phase={variant.length * 0.7} />
    </Canvas>
  );
}

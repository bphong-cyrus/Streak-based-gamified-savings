"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];
const CAT_KEYS = ["rabbit-office", "cat-office", "cat-farmer", "cat-wizard", "cat-knight"];

/** Màu theo chế độ ngày/đêm. */
function usePalette(night: boolean) {
  return useMemo(
    () =>
      night
        ? {
            sky: "#1a2049",
            grass: "#3f7a5e",
            grassTop: "#4e8570",
            dirt: "#5f4634",
            trunk: "#4a3628",
            leaf: "#2f6b4f",
            roof: "#6b5bb8",
            glass: "#2c3566",
            light: "#ffe9a3",
          }
        : {
            sky: "#00000000",
            grass: "#7ecf9c",
            grassTop: "#8fddaa",
            dirt: "#a97b4f",
            trunk: "#8a6238",
            leaf: "#5cb87f",
            roof: "#a794e6",
            glass: "#9fd3f0",
            light: "#fff3c4",
          },
    [night],
  );
}

/** Căn camera isometric nhìn về giữa tòa nhà. */
function CameraRig({ targetY }: { targetY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(11, 10, 11);
    camera.lookAt(0, targetY, 0);
  }, [camera, targetY]);
  return null;
}

/** Cửa sổ lồi mặt trước tòa nhà. */
function Window({ x, y, z, lit, color }: { x: number; y: number; z: number; lit: boolean; color: string }) {
  return (
    <group position={[x, y, z]}>
      {/* khung trắng */}
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.62, 0.05]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
      {/* kính */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.48, 0.48, 0.05]} />
        <meshStandardMaterial
          color={lit ? "#ffdf8e" : color}
          emissive={lit ? "#ffbf3f" : "#000000"}
          emissiveIntensity={lit ? 1.1 : 0}
        />
      </mesh>
      {/* chấu cửa sổ */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.03, 0.48, 0.02]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.48, 0.03, 0.02]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
    </group>
  );
}

/** Một tầng nhà. */
function Floor({ n, y, color, night }: { n: number; y: number; color: string; night: boolean }) {
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3.4, 1, 3.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* phào tầng */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[3.55, 0.08, 3.55]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
      {/* cửa tầng trệt */}
      {n === 1 && (
        <group position={[0, 0, 1.72]}>
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.72, 0.85, 0.08]} />
            <meshStandardMaterial color="#8a6238" />
          </mesh>
          <mesh position={[0.22, 0.42, 0.06]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#ffd166" />
          </mesh>
          {/* bậc thềm */}
          <mesh receiveShadow position={[0, -0.42, 0.25]}>
            <boxGeometry args={[1.1, 0.14, 0.6]} />
            <meshStandardMaterial color="#e0c690" />
          </mesh>
        </group>
      )}
      {/* hai cửa sổ mặt trước */}
      <Window x={-0.9} y={0.55} z={1.72} lit={night} color={night ? "#2c3566" : "#9fd3f0"} />
      <Window x={0.9} y={0.55} z={1.72} lit={night} color={night ? "#2c3566" : "#9fd3f0"} />
      {/* cửa sổ mặt hông phải */}
      <group position={[1.72, 0.55, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <Window x={0} y={0} z={0} lit={night} color={night ? "#2c3566" : "#9fd3f0"} />
      </group>
    </group>
  );
}

/** Mái chóp kim tự tháp + ống khói + cờ. */
function Roof({ y, color, night }: { y: number; color: string; night: boolean }) {
  const flag = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flag.current) flag.current.rotation.y = Math.sin(t * 2.2) * 0.18;
    if (smoke.current) {
      smoke.current.children.forEach((c, i) => {
        const p = ((t * 0.35 + i * 0.33) % 1) as number;
        c.position.set(Math.sin(t + i) * 0.08, p * 1.4, 0);
        const s = 0.12 + p * 0.22;
        c.scale.setScalar(s);
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - p);
      });
    }
  });
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow position={[0, 0.8, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.85, 1.7, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* ống khói */}
      <mesh castShadow position={[0.95, 1.35, -0.55]}>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color="#ff9fb2" />
      </mesh>
      <mesh castShadow position={[0.95, 1.84, -0.55]}>
        <boxGeometry args={[0.52, 0.12, 0.52]} />
        <meshStandardMaterial color="#f26d8d" />
      </mesh>
      {/* khói bay */}
      <group ref={smoke} position={[0.95, 1.95, -0.55]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color={night ? "#8f96c9" : "#ffffff"} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
      {/* cột cờ + lá cờ */}
      <mesh castShadow position={[-0.7, 2.35, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
        <meshStandardMaterial color="#8a7256" />
      </mesh>
      <mesh ref={flag} position={[-0.38, 2.72, 0.4]}>
        <boxGeometry args={[0.62, 0.36, 0.03]} />
        <meshStandardMaterial color="#f26d8d" />
      </mesh>
    </group>
  );
}

/** Tầng đang xây: hiệu ứng nhảy vào + cẩu tháp quay. */
function Construction({ y }: { y: number }) {
  const box = useRef<THREE.Group>(null);
  const crane = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = Math.min(1, clock.getElapsedTime() / 1.6);
    const e = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); // easeOutBack
    if (box.current) box.current.scale.setScalar(Math.max(0.01, e));
    if (crane.current) crane.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.5;
  });
  return (
    <>
      <group ref={box} position={[0, y, 0]}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[3.4, 1, 3.4]} />
          <meshStandardMaterial color="#f5d67e" />
        </mesh>
        <mesh position={[0, 0.5, 1.72]}>
          <boxGeometry args={[3.42, 0.16, 0.02]} />
          <meshStandardMaterial color="#e0b84f" />
        </mesh>
        <mesh position={[0, 0.75, 1.72]}>
          <boxGeometry args={[3.42, 0.16, 0.02]} />
          <meshStandardMaterial color="#e0b84f" />
        </mesh>
        <mesh position={[0, 0.25, 1.72]}>
          <boxGeometry args={[3.42, 0.16, 0.02]} />
          <meshStandardMaterial color="#e0b84f" />
        </mesh>
      </group>
      {/* cẩu tháp mini */}
      <group ref={crane} position={[3.1, 0, -1.6]}>
        <mesh castShadow position={[0, y + 1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
          <meshStandardMaterial color="#f26d8d" />
        </mesh>
        <mesh castShadow position={[-0.7, y + 2.35, 0]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[1.6, 0.1, 0.1]} />
          <meshStandardMaterial color="#f26d8d" />
        </mesh>
        <mesh position={[-1.35, y + 2.1, 0]}>
          <boxGeometry args={[0.16, 0.3, 0.16]} />
          <meshStandardMaterial color="#5b4a35" />
        </mesh>
      </group>
    </>
  );
}

/** WebGL không nhận ảnh SVG trực tiếp (không kích thước intrinsic) — rasterize qua canvas. */
function useSvgTexture(src: string) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 240;
      c.height = 300;
      c.getContext("2d")?.drawImage(img, 0, 0, 240, 300);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      if (alive) setTex(t);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return tex;
}

/** Mèo cư dân dạng billboard — ảnh SVG luôn quay về phía camera, nhấp nhô nhẹ. */
function Cat({ src, position, scale = 1, delay = 0 }: { src: string; position: [number, number, number]; scale?: number; delay?: number }) {
  const tex = useSvgTexture(src);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    ref.current.quaternion.copy(camera.quaternion);
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + delay) * 0.045;
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} position={position} scale={[0.85 * scale, 1.05 * scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
}

/** Cây trang trí quanh đảo. */
function Tree({ position, s = 1, leaf, trunk }: { position: [number, number, number]; s?: number; leaf: string; trunk: string }) {
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.7, 8]} />
        <meshStandardMaterial color={trunk} />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
      <mesh castShadow position={[0.16, 1.28, 0.05]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
    </group>
  );
}

/** Hoa nhỏ cắm quanh mặt cỏ. */
function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 6]} />
        <meshStandardMaterial color="#4fbe7d" />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export interface HouseSceneProps {
  floors: number;
  night: boolean;
  building: boolean;
  goalDone: boolean;
}

/** Cảnh 3D: đảo cỏ + tòa nhà low-poly mái chóp + cư dân mèo. */
export function HouseScene({ floors, night, building }: HouseSceneProps) {
  const p = usePalette(night);
  const total = Math.max(1, floors);
  const floorH = 1.08;
  const houseH = total * floorH + 0.15;

  return (
    <Canvas
      orthographic
      camera={{ position: [11, 10, 11], zoom: 44, near: 0.1, far: 100 }}
      shadows
      dpr={[1, 2]}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <CameraRig targetY={Math.max(2.2, houseH * 0.55)} />
      <ambientLight intensity={night ? 0.45 : 0.75} color={night ? "#6b76c9" : "#fff4e0"} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={night ? 0.5 : 1.1}
        color={night ? "#9aa5e8" : "#fff2d8"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
      />
      {night && <pointLight position={[0, 1.2, 2.6]} intensity={2.2} color="#ffbf3f" distance={5} />}

      {/* hòn đảo bệ: mặt cỏ + thân đất */}
      <mesh receiveShadow position={[0, -0.55, 0]}>
        <cylinderGeometry args={[4.4, 4.9, 1.1, 10]} />
        <meshStandardMaterial color={p.dirt} flatShading />
      </mesh>
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.42, 36]} />
        <meshStandardMaterial color={p.grassTop} />
      </mesh>

      {/* các tầng */}
      {Array.from({ length: total }, (_, i) => (
        <Floor key={i} n={i + 1} y={0.05 + i * floorH} color={FLOOR_COLORS[i % FLOOR_COLORS.length]} night={night} />
      ))}

      {/* tầng đang xây hoặc mái */}
      {building ? (
        <Construction y={0.05 + total * floorH} />
      ) : (
        <Roof y={0.05 + total * floorH - 0.12} color={p.roof} night={night} />
      )}

      {/* cây + hoa trang trí */}
      <Tree position={[-3.1, 0, -1.6]} s={1.1} leaf={p.leaf} trunk={p.trunk} />
      <Tree position={[3.3, 0, 1.4]} s={0.85} leaf={p.leaf} trunk={p.trunk} />
      <Tree position={[-2.4, 0, 2.4]} s={0.7} leaf={p.leaf} trunk={p.trunk} />
      <Flower position={[-1.6, 0, 2.9]} color="#ff9fb2" />
      <Flower position={[1.9, 0, 2.7]} color="#ffd166" />
      <Flower position={[2.6, 0, -2.2]} color="#c9bdf5" />
      <Flower position={[-3.2, 0, 0.9]} color="#ff9fb2" />

      {/* mèo cư dân đứng trước nhà */}
      <Cat src="/identities/rabbit-office.svg" position={[-1.5, 0.55, 2.6]} delay={0} />
      <Cat src="/identities/cat-office.svg" position={[-0.45, 0.5, 2.9]} scale={0.92} delay={1.2} />
      <Cat src="/identities/cat-wizard.svg" position={[0.7, 0.55, 2.75]} delay={2.1} />
      <Cat src="/identities/cat-knight.svg" position={[1.8, 0.5, 2.5]} scale={0.9} delay={3} />
      {/* mèo ngồi trên mái */}
      {!building && <Cat src="/identities/cat-farmer.svg" position={[0.4, 0.05 + total * floorH + 1.35, 1.15]} scale={0.8} delay={0.6} />}
    </Canvas>
  );
}

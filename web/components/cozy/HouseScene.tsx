"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Pet3D } from "@/components/cozy/Pet3D";

const WALL_COLOR = "#F7E8C8";
const ROOF_COLOR = "#AA6149";
const TRUNK_COLOR = "#8A6238";
const LEAF_COLOR = "#5CB87F";
const WINDOW_DAY = "#9FD3F0";
const WINDOW_NIGHT = "#2C3566";
const LIGHT_COLOR = "#FFDF8E";

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

function usePalette(night: boolean) {
  return useMemo(
    () =>
      night
        ? {
            wall: shade(WALL_COLOR, 0.55),
            roof: shade(ROOF_COLOR, 0.65),
            trunk: shade(TRUNK_COLOR, 0.5),
            leaf: shade(LEAF_COLOR, 0.6),
            grass: "#3F7A5E",
            dirt: "#5F4634",
            path: "#6B7194",
            sky: "#1A2049",
          }
        : {
            wall: WALL_COLOR,
            roof: ROOF_COLOR,
            trunk: TRUNK_COLOR,
            leaf: LEAF_COLOR,
            grass: "#7ECF9C",
            dirt: "#A97B4F",
            path: "#C9C2B4",
            sky: "transparent",
          },
    [night],
  );
}

function CameraRig({ targetY, floors, width, height, scale }: { targetY: number; floors: number; width: number; height: number; scale: number }) {
  const { camera } = useThree();
  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    const houseWidth = 5.2;
    const houseHeight = Math.max(3, targetY + 2.5);
    const pxPerUnit = Math.min(width / houseWidth, height / houseHeight) * 0.8 * scale;
    camera.zoom = Math.max(20, Math.min(400, pxPerUnit));
    camera.position.set(8, 7, 8);
    camera.lookAt(0, targetY * 0.35, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height, targetY, floors, scale]);
  return null;
}

function WindowMesh({ x, y, z, lit, color, rotY = 0 }: { x: number; y: number; z: number; lit: boolean; color: string; rotY?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.62, 0.05]} />
        <meshStandardMaterial color="#FFF6E0" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.48, 0.48, 0.05]} />
        <meshStandardMaterial color={lit ? LIGHT_COLOR : color} emissive={lit ? "#FFBF3F" : "#000000"} emissiveIntensity={lit ? 0.8 : 0} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.03, 0.48, 0.02]} />
        <meshStandardMaterial color="#FFF6E0" />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.48, 0.03, 0.02]} />
        <meshStandardMaterial color="#FFF6E0" />
      </mesh>
    </group>
  );
}

function Floor({ n, y, color, night }: { n: number; y: number; color: string; night: boolean }) {
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3.4, 1, 3.4]} />
        <meshStandardMaterial color={night ? shade(color, 0.55) : color} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0]}>
        <boxGeometry args={[3.55, 0.06, 3.55]} />
        <meshStandardMaterial color="#FFF6E0" />
      </mesh>
      {n === 1 && (
        <group position={[0, 0, 1.72]}>
          <mesh castShadow position={[0, 0.42, -0.01]}>
            <boxGeometry args={[0.84, 0.92, 0.08]} />
            <meshStandardMaterial color="#FFF6E0" />
          </mesh>
          <mesh position={[0, 0.85, -0.01]} rotation={[0, 0, Math.PI]}>
            <circleGeometry args={[0.42, 20, 0, Math.PI]} />
            <meshStandardMaterial color="#FFF6E0" side={THREE.DoubleSide} />
          </mesh>
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.72, 0.85, 0.08]} />
            <meshStandardMaterial color="#8A6238" />
          </mesh>
          <mesh position={[0, 0.22, 0.06]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#FFD166" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}
      <WindowMesh x={-0.9} y={0.55} z={1.72} lit={night} color={night ? WINDOW_NIGHT : WINDOW_DAY} />
      <WindowMesh x={0.9} y={0.55} z={1.72} lit={night} color={night ? WINDOW_NIGHT : WINDOW_DAY} />
      <WindowMesh x={1.72} y={0.55} z={-0.6} lit={night} color={night ? WINDOW_NIGHT : WINDOW_DAY} rotY={Math.PI / 2} />
    </group>
  );
}

function Roof({ y, night }: { y: number; night: boolean }) {
  const flag = useRef<THREE.Mesh>(null);
  const color = night ? shade(ROOF_COLOR, 0.65) : ROOF_COLOR;
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.getElapsedTime() * 2) * 0.15;
  });
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow position={[-1, 0.75, 0]} rotation={[0, 0, 0.64]}>
        <boxGeometry args={[2.5, 0.08, 4.2]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[1, 0.75, 0]} rotation={[0, 0, -0.64]}>
        <boxGeometry args={[2.5, 0.08, 4.2]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 1.55, 0]}>
        <boxGeometry args={[0.16, 0.16, 4.3]} />
        <meshStandardMaterial color={shade(color, 0.75)} />
      </mesh>
      <mesh castShadow position={[1.0, 1.1, -0.8]}>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color="#FF9FB2" />
      </mesh>
      <mesh castShadow position={[-0.7, 1.85, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
        <meshStandardMaterial color="#8A7256" />
      </mesh>
      <mesh ref={flag} position={[-0.38, 2.25, 0.4]}>
        <boxGeometry args={[0.62, 0.36, 0.03]} />
        <meshStandardMaterial color="#F26D8D" />
      </mesh>
    </group>
  );
}

function Construction({ y }: { y: number }) {
  const box = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = Math.min(1, clock.getElapsedTime() / 1.6);
    const e = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
    if (box.current) box.current.scale.setScalar(Math.max(0.01, e));
  });
  return (
    <>
      <group ref={box} position={[0, y, 0]}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[3.4, 1, 3.4]} />
          <meshStandardMaterial color="#F5D67E" />
        </mesh>
      </group>
      <mesh castShadow position={[3.1, y + 1.2, -1.6]}>
        <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#F26D8D" />
      </mesh>
    </>
  );
}

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
    </group>
  );
}


// ---------------------------------------------------------------------
// Trang tri bau troi & quanh dao
// ---------------------------------------------------------------------

/** Den vuon: cot sam + bong vang phat sang (ban dem). */
function LampPost({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 1.0, 8]} />
        <meshStandardMaterial color="#4A3F35" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.06, 0]}>
        <cylinderGeometry args={[0.02, 0.14, 0.1, 8]} />
        <meshStandardMaterial color="#4A3F35" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <sphereGeometry args={[0.095, 12, 12]} />
        <meshStandardMaterial color="#FFDF8E" emissive="#FFBF3F" emissiveIntensity={1.4} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 1.0, 0]} intensity={1.6} color="#FFBF3F" distance={3.2} decay={2} />
    </group>
  );
}

/** Bui cay tron xanh quanh dao. */
function Bush({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color="#4E9C6F" roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow position={[0.24, 0.16, 0.1]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#5FB87F" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

/** Chim bay luon: hai canh vay, bay qua bau troi. */
function Bird() {
  const g = useRef<THREE.Group>(null);
  const wL = useRef<THREE.Mesh>(null);
  const wR = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (g.current) {
      const x = ((t * 0.5) % 15) - 7.5;
      g.current.position.set(x, 3.0 + Math.sin(t * 1.3) * 0.2, -2.6);
      g.current.rotation.z = Math.sin(t * 1.3) * 0.15;
    }
    const flap = Math.sin(t * 9) * 0.55;
    if (wL.current) wL.current.rotation.z = 0.35 + flap;
    if (wR.current) wR.current.rotation.z = -0.35 - flap;
  });
  return (
    <group ref={g} position={[-7.5, 3.0, -2.6]} scale={0.8}>
      <mesh castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#5B6B8C" roughness={0.8} />
      </mesh>
      <mesh ref={wL} castShadow position={[-0.14, 0.02, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.3, 0.03, 0.14]} />
        <meshStandardMaterial color="#7285AA" roughness={0.8} />
      </mesh>
      <mesh ref={wR} castShadow position={[0.14, 0.02, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.3, 0.03, 0.14]} />
        <meshStandardMaterial color="#7285AA" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** UFO lo lung ban dem: dia + vom + den nhap nhay + tia sang. */
function UFO() {
  const g = useRef<THREE.Group>(null);
  const l1 = useRef<THREE.Mesh>(null);
  const l2 = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (g.current) {
      g.current.position.y = 2.65 + Math.sin(t * 0.9) * 0.18;
      g.current.rotation.y = t * 0.5;
    }
    const blink = Math.sin(t * 5) > 0 ? 1.8 : 0.3;
    if (l1.current) (l1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
    if (l2.current) (l2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.1 - blink;
  });
  return (
    <group ref={g} position={[3.7, 2.65, -2.2]} scale={0.62}>
      <mesh castShadow scale={[1, 0.32, 1]}>
        <sphereGeometry args={[0.55, 18, 12]} />
        <meshStandardMaterial color="#9AA7C7" metalness={0.65} roughness={0.35} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#BFE8FF" emissive="#7FD4FF" emissiveIntensity={0.5} roughness={0.2} metalness={0.2} />
      </mesh>
      <mesh ref={l1} position={[0.42, -0.04, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#FF9FB2" emissive="#FF6E8C" emissiveIntensity={1.8} />
      </mesh>
      <mesh ref={l2} position={[-0.42, -0.04, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#9EE8B0" emissive="#5FD88A" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.42, 1.1, 16, 1, true]} />
        <meshBasicMaterial color="#BFE8FF" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export interface HouseSceneProps {
  floors: number;
  night: boolean;
  building: boolean;
  goalDone: boolean;
  celebrating?: boolean;
  width: number;
  height: number;
  scale: number;
}

export function HouseScene({ floors, night, building, celebrating, width, height, scale }: HouseSceneProps) {
  const p = usePalette(night);
  const total = Math.max(1, floors);
  const floorH = 1.08;
  const houseH = total * floorH + 1.6;

  return (
    <Canvas
      orthographic
      camera={{ position: [8, 7, 8], zoom: 70, near: 0.1, far: 100 }}
      shadows
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }}
    >
      <CameraRig targetY={houseH * 0.45} floors={total} width={width} height={height} scale={scale} />
      <hemisphereLight args={[night ? "#3A4080" : "#BCD9FF", night ? "#2A2118" : "#7A6248", night ? 0.5 : 0.7]} />
      <ambientLight intensity={night ? 0.3 : 0.4} color={night ? "#6B76C9" : "#FFF4E0"} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={night ? 0.55 : 1.1}
        color={night ? "#9AA5E8" : "#FFEDC8"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      {night && <pointLight position={[0, 1.2, 2.6]} intensity={2} color="#FFBF3F" distance={5} />}

      <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 32]} />
        <meshBasicMaterial color={night ? "#0B0D22" : "#3D6B52"} transparent opacity={0.25} />
      </mesh>

      <mesh receiveShadow position={[0, -0.55, 0]}>
        <cylinderGeometry args={[4.4, 4.9, 1.1, 10]} />
        <meshStandardMaterial color={p.dirt} roughness={1} />
      </mesh>
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.42, 36]} />
        <meshStandardMaterial color={p.grass} roughness={1} />
      </mesh>

      {Array.from({ length: total }, (_, i) => (
        <Floor key={i} n={i + 1} y={0.05 + i * floorH} color={WALL_COLOR} night={night} />
      ))}

      {building ? <Construction y={0.05 + total * floorH} /> : <Roof y={0.05 + total * floorH - 0.12} night={night} />}

      <Tree position={[-3.1, 0, -1.6]} s={1.1} leaf={p.leaf} trunk={p.trunk} />
      <Tree position={[3.3, 0, 1.4]} s={0.85} leaf={p.leaf} trunk={p.trunk} />
      <Tree position={[-2.4, 0, 2.4]} s={0.7} leaf={p.leaf} trunk={p.trunk} />

      {/* Đèn vườn + bụi cây quanh đảo */}
      {night && <LampPost position={[-2.6, 0.05, 2.4]} s={0.95} />}
      {night && <LampPost position={[2.8, 0.05, 2.2]} s={0.9} />}
      {night && <LampPost position={[3.1, 0.05, -1.8]} s={0.85} />}
      <Bush position={[-1.9, 0.02, -2.5]} s={0.85} />
      <Bush position={[2.3, 0.02, -2.6]} s={0.65} />

      {/* UFO + chim bay thấp quanh nhà; trăng/sao/mây/mặt trờ nằm ở lớp phủ HTML phía trên canvas */}
      {night && <UFO />}
      {!night && <Bird />}

      {/* Cư dân 3D thực thụ — thay thế ảnh SVG billboard cũ */}
      <Pet3D variant="rabbit-office" position={[-1.5, 0.12, 2.55]} rotationY={0.5} phase={0} />
      <Pet3D variant="cat-wizard" position={[1.15, 0.12, 2.75]} rotationY={-0.25} scale={0.92} phase={1} />
      {!building && (
        <Pet3D
          variant="cat-farmer"
          position={[0.15, 0.05 + total * floorH + 1.62, 0.35]}
          rotationY={0.6}
          scale={0.72}
          phase={2}
        />
      )}
    </Canvas>
  );
}

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

/** Nguồn ngẫu nhiên xác định (texture ổn định giữa các render). */
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TexKind = "plaster" | "tiles" | "grass" | "dirt";

/** Texture procedural 128px: plaster có vân, ngói chồng lớp, cỏ speckle, đất vạch tầng. */
function useCanvasTexture(kind: TexKind, color: string, repeat = 2) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const rand = mulberry(kind.length * 977 + color.charCodeAt(3) * 31);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);

    if (kind === "tiles") {
      // hàng ngói chồng: mỗi hàng 16px, hàng lẻ lệch nửa viên
      for (let y = 0; y < 128; y += 16) {
        const off = (y / 16) % 2 === 0 ? 0 : 16;
        for (let x = -32; x < 128; x += 32) {
          const g = ctx.createLinearGradient(0, y, 0, y + 15);
          g.addColorStop(0, color);
          g.addColorStop(1, shade(color, 0.82));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(x + off, y, 30, 15, 4);
          ctx.fill();
          ctx.fillStyle = shade(color, 0.68);
          ctx.fillRect(x + off, y + 13, 30, 2.5);
        }
      }
    } else if (kind === "dirt") {
      // tầng đất nâu xen kẽ + hạt sỏi
      for (let y = 0; y < 128; y += 14) {
        ctx.fillStyle = rand() > 0.5 ? shade(color, 0.92) : shade(color, 1.06);
        ctx.fillRect(0, y, 128, 14);
      }
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rand() > 0.5 ? shade(color, 0.75) : shade(color, 1.18);
        const r = 1 + rand() * 2;
        ctx.beginPath();
        ctx.arc(rand() * 128, rand() * 128, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // plaster & grass: speckle sáng/tối
      for (let i = 0; i < (kind === "grass" ? 380 : 220); i++) {
        const g = rand() > 0.5 ? 1.12 : 0.88;
        ctx.fillStyle = shade(color, g);
        const r = kind === "grass" ? 1 + rand() * 2.2 : 1 + rand() * 3;
        ctx.beginPath();
        ctx.arc(rand() * 128, rand() * 128, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (kind === "grass") {
        // ngọn cỏ nhỏ
        ctx.strokeStyle = shade(color, 0.8);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 90; i++) {
          const x = rand() * 128;
          const y = rand() * 128;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rand() - 0.5) * 3, y - 4 - rand() * 3);
          ctx.stroke();
        }
      }
      if (kind === "plaster") {
        // vệt ố mờ lớn cho tường có chiều sâu
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(70,56,39,${0.03 + rand() * 0.04})`;
          ctx.beginPath();
          ctx.ellipse(rand() * 128, rand() * 128, 12 + rand() * 22, 8 + rand() * 14, rand(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, color, repeat]);
}

/** Tối màu hex đi một hệ số (dùng cho texture). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

/** Căn camera isometric nhìn về giữa tòa nhà. */
function CameraRig({ targetY }: { targetY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(9, 8, 9);
    camera.lookAt(0, targetY, 0);
  }, [camera, targetY]);
  // Lắc nhẹ quanh trục để cảnh sống động nhưng vẫn ổn định
  useFrame(({ clock }) => {
    const a = Math.sin(clock.getElapsedTime() * 0.18) * 0.25;
    const r = Math.hypot(9, 9);
    const b = Math.atan2(9, 9) + a * 0.05;
    camera.position.set(Math.cos(b) * r, 8 + Math.sin(clock.getElapsedTime() * 0.12) * 0.15, Math.sin(b) * r);
    camera.lookAt(0, targetY, 0);
  });
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
      {/* cửa chớp hai bên */}
      <mesh castShadow position={[-0.44, 0, 0]}>
        <boxGeometry args={[0.18, 0.6, 0.05]} />
        <meshStandardMaterial color="#7fbf95" />
      </mesh>
      <mesh castShadow position={[0.44, 0, 0]}>
        <boxGeometry args={[0.18, 0.6, 0.05]} />
        <meshStandardMaterial color="#7fbf95" />
      </mesh>
      {/* ngạch cửa sổ lồi ra */}
      <mesh castShadow position={[0, 0.36, 0.02]}>
        <boxGeometry args={[0.7, 0.06, 0.08]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
    </group>
  );
}

/** Một tầng nhà: tường plaster có vân, cửa vòm, phào trắng. */
function Floor({ n, y, color, night }: { n: number; y: number; color: string; night: boolean }) {
  const wallTex = useCanvasTexture("plaster", night ? shade(color, 0.55) : color, 2);
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3.4, 1, 3.4]} />
        <meshStandardMaterial map={wallTex} color="#ffffff" />
      </mesh>
      {/* phào tầng */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[3.55, 0.08, 3.55]} />
        <meshStandardMaterial color="#fff6e0" />
      </mesh>
      {/* cửa vòm tầng trệt */}
      {n === 1 && (
        <group position={[0, 0, 1.72]}>
          {/* khung cửa vòm trắng */}
          <mesh castShadow position={[0, 0.42, -0.01]}>
            <boxGeometry args={[0.84, 0.92, 0.08]} />
            <meshStandardMaterial color="#fff6e0" />
          </mesh>
          <mesh position={[0, 0.85, -0.01]} rotation={[0, 0, Math.PI]}>
            <circleGeometry args={[0.42, 20, 0, Math.PI]} />
            <meshStandardMaterial color="#fff6e0" side={THREE.DoubleSide} />
          </mesh>
          {/* cánh cửa */}
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.72, 0.85, 0.08]} />
            <meshStandardMaterial color="#8a6238" />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI]}>
            <circleGeometry args={[0.36, 20, 0, Math.PI]} />
            <meshStandardMaterial color="#8a6238" side={THREE.DoubleSide} />
          </mesh>
          {/* tay nắm */}
          <mesh position={[0.22, 0.42, 0.06]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#ffd166" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* bậc thềm đá */}
          <mesh receiveShadow position={[0, -0.42, 0.3]}>
            <boxGeometry args={[1.3, 0.14, 0.7]} />
            <meshStandardMaterial color="#c9c2b4" />
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

/** Mái ngói gable 2 mái: slope box có texture ngói chồng, đầu hồi plaster, ridge cap, ống khói, cờ. */
function Roof({ y, color, night }: { y: number; color: string; night: boolean }) {
  const flag = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const tilesTex = useCanvasTexture("tiles", color, 3);
  const gableColor = night ? "#4a3f8c" : "#f5e6cf";
  const gableTex = useCanvasTexture("plaster", gableColor, 1.5);

  // Hình học mái: nửa rộng 2.0, cao 1.5 → slope dài 2.5, nghiêng atan(1.5/2) = 36.87°
  const HALF_W = 2.0;
  const ROOF_H = 1.5;
  const SLOPE = Math.hypot(HALF_W, ROOF_H);
  const ANGLE = Math.atan2(ROOF_H, HALF_W);
  const DEPTH = 4.0;

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
      {/* hai mái dốc */}
      <mesh castShadow position={[-HALF_W / 2, ROOF_H / 2, 0]} rotation={[0, 0, ANGLE]}>
        <boxGeometry args={[SLOPE + 0.15, 0.09, DEPTH]} />
        <meshStandardMaterial map={tilesTex} color="#ffffff" />
      </mesh>
      <mesh castShadow position={[HALF_W / 2, ROOF_H / 2, 0]} rotation={[0, 0, -ANGLE]}>
        <boxGeometry args={[SLOPE + 0.15, 0.09, DEPTH]} />
        <meshStandardMaterial map={tilesTex} color="#ffffff" />
      </mesh>
      {/* đầu hồi hai bên (tam giác plaster) */}
      <Gable x={-1.7} halfW={HALF_W} roofH={ROOF_H} depth={3.4} tex={gableTex} flip={false} />
      <Gable x={1.7} halfW={HALF_W} roofH={ROOF_H} depth={3.4} tex={gableTex} flip />
      {/* ridge cap dọc đỉnh mái */}
      <mesh castShadow position={[0, ROOF_H, 0]}>
        <boxGeometry args={[0.18, 0.18, DEPTH + 0.1]} />
        <meshStandardMaterial color={shade(color, 0.75)} />
      </mesh>
      {/* ống khói bám trên mái phải */}
      <mesh castShadow position={[1.0, ROOF_H * 0.75, -0.8]}>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color="#ff9fb2" />
      </mesh>
      <mesh castShadow position={[1.0, ROOF_H * 0.75 + 0.49, -0.8]}>
        <boxGeometry args={[0.52, 0.12, 0.52]} />
        <meshStandardMaterial color="#f26d8d" />
      </mesh>
      {/* khói bay */}
      <group ref={smoke} position={[1.0, ROOF_H * 0.75 + 0.6, -0.8]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color={night ? "#8f96c9" : "#ffffff"} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
      {/* cột cờ cắm trên đỉnh ridge + lá cờ */}
      <mesh castShadow position={[-0.7, ROOF_H + 0.35, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
        <meshStandardMaterial color="#8a7256" />
      </mesh>
      <mesh ref={flag} position={[-0.38, ROOF_H + 0.75, 0.4]}>
        <boxGeometry args={[0.62, 0.36, 0.03]} />
        <meshStandardMaterial color="#f26d8d" />
      </mesh>
    </group>
  );
}

/** Đầu hồi tam giác của mái gable — nằm ở mặt x của khối nhà. */
function Gable({ x, halfW, roofH, depth, tex, flip }: { x: number; halfW: number; roofH: number; depth: number; tex: THREE.Texture; flip: boolean }) {
  const shape = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-depth / 2, 0);
    sh.lineTo(depth / 2, 0);
    sh.lineTo(0, roofH);
    sh.closePath();
    return sh;
  }, [depth, roofH]);
  return (
    <mesh castShadow position={[x, 0, 0]} rotation={[0, flip ? -Math.PI / 2 : Math.PI / 2, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial map={tex} color="#ffffff" side={THREE.DoubleSide} />
    </mesh>
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

/** Mèo đi dạo quanh đảo theo vòng tròn, luôn quay mặt về camera. */
function WalkingCat({ src, radius = 2.9, speed = 0.25 }: { src: string; radius?: number; speed?: number }) {
  const tex = useSvgTexture(src);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const a = t * speed;
    ref.current.position.set(Math.cos(a) * radius, 0.5 + Math.abs(Math.sin(t * 6)) * 0.05, Math.sin(a) * radius);
    ref.current.quaternion.copy(camera.quaternion);
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} scale={[0.75, 0.95, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
}

/** Cơn mưa vàng ăn mừng: đồng xu rơi từ mái nhà xuống sân. */
function CoinShower({ topY }: { topY: number }) {
  const group = useRef<THREE.Group>(null);
  const coins = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: (Math.sin(i * 7.3) * 0.5 + 0.5 - 0.5) * 2.4,
        z: (Math.cos(i * 3.1) * 0.5) * 2.4,
        delay: (i % 7) * 0.18,
        speed: 2.6 + (i % 3) * 0.5,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((c, i) => {
      const cfg = coins[i];
      const p = ((t * cfg.speed + cfg.delay * 3) % 1.6) / 1.6;
      c.position.set(cfg.x + Math.sin(t * 3 + i) * 0.15, topY - p * (topY + 0.6), cfg.z);
      c.rotation.z = t * 5 + i;
      c.rotation.x = Math.PI / 2 + Math.sin(t * 4 + i) * 0.4;
      c.visible = p < 0.95;
    });
  });
  return (
    <group ref={group}>
      {coins.map((_, i) => (
        <mesh key={i} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.04, 12]} />
          <meshStandardMaterial color="#ffd166" emissive="#b8860b" emissiveIntensity={0.25} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export interface HouseSceneProps {
  floors: number;
  night: boolean;
  building: boolean;
  goalDone: boolean;
  celebrating?: boolean;
}

/** Cảnh 3D: đảo cỏ + tòa nhà low-poly mái chóp + cư dân mèo. */
/** Lối đi đá từ cửa ra mép đảo. */
function PathStones({ color }: { color: string }) {
  const stones = [
    [0, 2.6, 0.55], [0.25, 3.1, 0.5], [-0.15, 3.6, 0.45], [0.2, 4.0, 0.4],
  ] as const;
  return (
    <group>
      {stones.map(([x, z, r], i) => (
        <mesh key={i} receiveShadow position={[x, 0.03, z]} scale={[1, 0.25, 1]}>
          <cylinderGeometry args={[r, r, 0.12, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Hàng rào gỗ mini quanh rìa trước đảo. */
function Fence({ night }: { night: boolean }) {
  const wood = night ? "#4a3628" : "#a97b4f";
  const posts: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
    posts.push({ x: Math.sin(a) * 3.9, z: Math.cos(a) * 3.9 });
  }
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} castShadow position={[p.x, 0.22, p.z]}>
          <boxGeometry args={[0.09, 0.44, 0.09]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      ))}
      {/* hai thanh ngang vòng cung */}
      {posts.slice(0, -1).map((p, i) => {
        const n = posts[i + 1];
        const mx = (p.x + n.x) / 2, mz = (p.z + n.z) / 2;
        const len = Math.hypot(n.x - p.x, n.z - p.z);
        const rot = Math.atan2(n.x - p.x, n.z - p.z);
        return (
          <group key={`r${i}`}>
            <mesh castShadow position={[mx, 0.32, mz]} rotation={[0, rot, 0]}>
              <boxGeometry args={[0.05, 0.06, len]} />
              <meshStandardMaterial color={wood} />
            </mesh>
            <mesh castShadow position={[mx, 0.16, mz]} rotation={[0, rot, 0]}>
              <boxGeometry args={[0.05, 0.06, len]} />
              <meshStandardMaterial color={wood} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function HouseScene({ floors, night, building, celebrating }: HouseSceneProps) {
  const p = usePalette(night);
  const total = Math.max(1, floors);
  const floorH = 1.08;
  const houseH = total * floorH + 0.15;
  const grassTex = useCanvasTexture("grass", p.grassTop, 4);
  const dirtTex = useCanvasTexture("dirt", p.dirt, 2);
  const pathColor = night ? "#6b7194" : "#c9c2b4";

  return (
    <Canvas
      orthographic
      camera={{ position: [9, 8, 9], zoom: 56, near: 0.1, far: 100 }}
      shadows
      dpr={[1, 2]}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <CameraRig targetY={Math.max(2.2, houseH * 0.55)} />
      {/* Ánh sáng tự nhiên: bầu trờ/đất + nắng ấm + rim light */}
      <hemisphereLight args={[night ? "#3a4080" : "#bcd9ff", night ? "#2a2118" : "#7a6248", night ? 0.5 : 0.75]} />
      <ambientLight intensity={night ? 0.3 : 0.35} color={night ? "#6b76c9" : "#fff4e0"} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={night ? 0.55 : 1.15}
        color={night ? "#9aa5e8" : "#ffedc8"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-7, 4, -5]} intensity={night ? 0.12 : 0.25} color={night ? "#4a5ba8" : "#cfe4ff"} />
      {night && <pointLight position={[0, 1.2, 2.6]} intensity={2.2} color="#ffbf3f" distance={5} />}

      {/* bóng đổ mềm bên dưới đảo */}
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 32]} />
        <meshBasicMaterial color={night ? "#0b0d22" : "#3d6b52"} transparent opacity={0.28} />
      </mesh>

      {/* hòn đảo bệ: mặt cỏ speckle + thân đất vạch tầng */}
      <mesh receiveShadow position={[0, -0.55, 0]}>
        <cylinderGeometry args={[4.4, 4.9, 1.1, 10]} />
        <meshStandardMaterial map={dirtTex} color="#ffffff" />
      </mesh>
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.42, 36]} />
        <meshStandardMaterial map={grassTex} color="#ffffff" />
      </mesh>

      {/* lối đi đá + hàng rào */}
      <PathStones color={pathColor} />
      <Fence night={night} />

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
      {/* mèo đi dạo quanh nhà */}
      <WalkingCat src="/identities/cat-office.svg" />
      {/* mưa vàng ăn mừng */}
      {celebrating && <CoinShower topY={houseH + 2.4} />}
    </Canvas>
  );
}

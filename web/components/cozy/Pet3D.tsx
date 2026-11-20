"use client";

/**
 * Mô hình 3D thực thụ cho 5 nhân vật (thay thế ảnh SVG billboard cũ trong cảnh nhà).
 * Low-poly + flat shading + viền màu ấm, học art style từ bộ SVG gốc (pastel, outline nâu).
 * Mỗi nhân vật = mèo nền + phụ kiện riêng; riêng "rabbit-office" đổi tai dài thành thỏ.
 */

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export type PetVariant = "rabbit-office" | "cat-office" | "cat-farmer" | "cat-wizard" | "cat-knight";

const C = {
  outline: "#5B4A35",
  furCat: "#F5A94B",
  furRabbit: "#D9C7B2",
  belly: "#FFF6E0",
  blush: "#FFB3C1",
  eye: "#3A2E22",
  glint: "#FFFFFF",
  nose: "#E8798F",
  straw: "#D9B44A",
  strawBand: "#8A6238",
  robe: "#4A90D9",
  robeDark: "#3A76B8",
  star: "#FFD166",
  metal: "#B9C4D6",
  metalDark: "#8A94A6",
  staff: "#8A6238",
  orb: "#7FD4FF",
  tie: "#7A8799",
  collar: "#FFFDF6",
};

interface Palette {
  fur: string;
  longEars: boolean;
}

const PALETTES: Record<PetVariant, Palette> = {
  "rabbit-office": { fur: C.furRabbit, longEars: true },
  "cat-office": { fur: C.furCat, longEars: false },
  "cat-farmer": { fur: C.furCat, longEars: false },
  "cat-wizard": { fur: C.furCat, longEars: false },
  "cat-knight": { fur: "#E8B04B", longEars: false },
};

function Mat({ color, extra }: { color: string; extra?: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number; flatShading?: boolean } }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={extra?.roughness ?? 0.85}
      metalness={extra?.metalness ?? 0}
      emissive={extra?.emissive ?? "#000000"}
      emissiveIntensity={extra?.emissiveIntensity ?? 0}
      flatShading={extra?.flatShading ?? true}
    />
  );
}

export interface Pet3DProps {
  variant: PetVariant;
  position?: [number, number, number];
  scale?: number;
  /** Góc quay ban đầu (radian). */
  rotationY?: number;
  /** Nhịp điệu hoạt họa lệch nhau giữa các con để không đồng bộ. */
  phase?: number;
}

/** Mèo/thỏ 3D low-poly: thân tròn, đầu lắc nhẹ, đuôi vẫy, mắt chớp. Cao ~1.35 đơn vị. */
export function Pet3D({ variant, position = [0, 0, 0], scale = 1, rotationY = 0, phase = 0 }: Pet3DProps) {
  const pal = PALETTES[variant];
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase * 7.13;
    if (root.current) root.current.position.y = position[1] + Math.sin(t * 1.6) * 0.025;
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.9) * 0.06;
      head.current.rotation.y = Math.sin(t * 0.55) * 0.12;
    }
    if (tail.current) tail.current.rotation.x = Math.sin(t * 2.2) * 0.25;
    // Mắt chớp mỗi ~3.5s (nhanh, không che hoạt họa chính)
    const blink = Math.sin(t * 1.8) > 0.985 ? 0.12 : 1;
    if (eyeL.current) eyeL.current.scale.y = blink;
    if (eyeR.current) eyeR.current.scale.y = blink;
  });

  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Đuôi: dây cầu vồng 4 đốt, bắt đầu từ sau lưng */}
      <group ref={tail} position={[0, 0.42, -0.34]} rotation={[-0.5, 0, 0]}>
        {([0, 1, 2, 3] as const).map((i) => (
          <mesh key={i} castShadow position={[0, i === 0 ? 0 : 0.11, i === 0 ? 0 : -0.09]} rotation={[0.5, 0, 0]}>
            <sphereGeometry args={[0.085 - i * 0.012, 8, 8]} />
            <Mat color={pal.fur} />
          </mesh>
        ))}
      </group>

      {/* Thân */}
      <mesh castShadow position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.42, 14, 12]} />
        <Mat color={pal.fur} />
      </mesh>
      {/* Bụng sáng màu */}
      <mesh castShadow position={[0, 0.42, 0.14]} scale={[0.78, 0.85, 0.62]}>
        <sphereGeometry args={[0.34, 12, 10]} />
        <Mat color={C.belly} />
      </mesh>
      {/* Chân trước */}
      <mesh castShadow position={[-0.16, 0.1, 0.26]} scale={[1, 0.6, 1.3]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <Mat color={pal.fur} />
      </mesh>
      <mesh castShadow position={[0.16, 0.1, 0.26]} scale={[1, 0.6, 1.3]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <Mat color={pal.fur} />
      </mesh>

      {/* Đầu */}
      <group ref={head} position={[0, 1.02, 0.06]}>
        <mesh castShadow>
          <sphereGeometry args={[0.36, 14, 12]} />
          <Mat color={pal.fur} />
        </mesh>

        {/* Tai: mèo = tam giác nhọn; thỏ = tai dài capsule */}
        {pal.longEars ? (
          <>
            <mesh castShadow position={[-0.15, 0.5, -0.02]} rotation={[0.08, 0, -0.12]}>
              <capsuleGeometry args={[0.075, 0.34, 4, 8]} />
              <Mat color={pal.fur} />
            </mesh>
            <mesh castShadow position={[0.15, 0.5, -0.02]} rotation={[0.08, 0, 0.12]}>
              <capsuleGeometry args={[0.075, 0.34, 4, 8]} />
              <Mat color={pal.fur} />
            </mesh>
            <mesh position={[-0.15, 0.5, 0.045]} rotation={[0.08, 0, -0.12]} scale={[0.55, 0.8, 0.5]}>
              <capsuleGeometry args={[0.075, 0.3, 4, 8]} />
              <Mat color={C.blush} />
            </mesh>
            <mesh position={[0.15, 0.5, 0.045]} rotation={[0.08, 0, 0.12]} scale={[0.55, 0.8, 0.5]}>
              <capsuleGeometry args={[0.075, 0.3, 4, 8]} />
              <Mat color={C.blush} />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[-0.2, 0.34, -0.02]} rotation={[0, 0, 0.28]}>
              <coneGeometry args={[0.13, 0.3, 4]} />
              <Mat color={pal.fur} />
            </mesh>
            <mesh castShadow position={[0.2, 0.34, -0.02]} rotation={[0, 0, -0.28]}>
              <coneGeometry args={[0.13, 0.3, 4]} />
              <Mat color={pal.fur} />
            </mesh>
            <mesh position={[-0.19, 0.33, 0.05]} rotation={[0, 0, 0.28]}>
              <coneGeometry args={[0.07, 0.18, 4]} />
              <Mat color={C.blush} />
            </mesh>
            <mesh position={[0.19, 0.33, 0.05]} rotation={[0, 0, -0.28]}>
              <coneGeometry args={[0.07, 0.18, 4]} />
              <Mat color={C.blush} />
            </mesh>
          </>
        )}

        {/* Mắt + đốm sáng */}
        <mesh ref={eyeL} position={[-0.13, 0.04, 0.31]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <Mat color={C.eye} extra={{ flatShading: false, roughness: 0.3 }} />
        </mesh>
        <mesh ref={eyeR} position={[0.13, 0.04, 0.31]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <Mat color={C.eye} extra={{ flatShading: false, roughness: 0.3 }} />
        </mesh>
        <mesh position={[-0.115, 0.06, 0.355]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <Mat color={C.glint} extra={{ flatShading: false, roughness: 0.2 }} />
        </mesh>
        <mesh position={[0.145, 0.06, 0.355]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <Mat color={C.glint} extra={{ flatShading: false, roughness: 0.2 }} />
        </mesh>

        {/* Má hồng + mũi */}
        <mesh position={[-0.22, -0.07, 0.27]} scale={[1, 0.65, 0.5]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <Mat color={C.blush} />
        </mesh>
        <mesh position={[0.22, -0.07, 0.27]} scale={[1, 0.65, 0.5]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <Mat color={C.blush} />
        </mesh>
        <mesh position={[0, -0.045, 0.35]} scale={[1.2, 0.8, 0.8]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <Mat color={C.nose} />
        </mesh>

        {/* Phụ kiện đầu theo nhân vật */}
        {variant === "cat-farmer" && (
          <group position={[0, 0.3, 0]}>
            <mesh castShadow position={[0, 0.02, 0]} rotation={[0.06, 0, 0]}>
              <cylinderGeometry args={[0.42, 0.44, 0.05, 16]} />
              <Mat color={C.straw} />
            </mesh>
            <mesh castShadow position={[0, 0.17, 0]} rotation={[0.06, 0, 0]}>
              <coneGeometry args={[0.25, 0.28, 14]} />
              <Mat color={C.straw} />
            </mesh>
            <mesh position={[0, 0.09, 0]} rotation={[0.06, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.27, 0.05, 14]} />
              <Mat color={C.strawBand} />
            </mesh>
          </group>
        )}

        {variant === "cat-wizard" && (
          <group position={[0, 0.26, 0]}>
            <mesh castShadow position={[0, 0.02, 0]} rotation={[0.1, 0, 0.05]}>
              <cylinderGeometry args={[0.4, 0.42, 0.05, 16]} />
              <Mat color={C.robeDark} />
            </mesh>
            <mesh castShadow position={[0, 0.3, 0]} rotation={[0.1, 0, 0.05]}>
              <coneGeometry args={[0.24, 0.55, 14]} />
              <Mat color={C.robe} />
            </mesh>
            <mesh position={[0.06, 0.42, 0.14]} rotation={[0.4, 0.3, 0]}>
              <octahedronGeometry args={[0.055]} />
              <Mat color={C.star} extra={{ emissive: C.star, emissiveIntensity: 0.6, flatShading: false }} />
            </mesh>
            <mesh position={[-0.1, 0.16, 0.3]}>
              <octahedronGeometry args={[0.04]} />
              <Mat color={C.star} extra={{ emissive: C.star, emissiveIntensity: 0.6, flatShading: false }} />
            </mesh>
          </group>
        )}

        {variant === "cat-knight" && (
          <group position={[0, 0.05, 0]}>
            {/* Mũ giáp bao 3/4 đầu, có khe mắt */}
            <mesh castShadow position={[0, 0.06, -0.03]} scale={[1.02, 1.02, 1.02]}>
              <sphereGeometry args={[0.37, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              <Mat color={C.metal} extra={{ metalness: 0.75, roughness: 0.35, flatShading: false }} />
            </mesh>
            <mesh position={[0, 0.02, 0.3]}>
              <boxGeometry args={[0.42, 0.045, 0.1]} />
              <Mat color={C.metalDark} extra={{ metalness: 0.6, roughness: 0.4 }} />
            </mesh>
            {/* Lông đỏ trên đỉnh mũ */}
            <mesh castShadow position={[0, 0.42, -0.05]} rotation={[0.2, 0, 0]}>
              <coneGeometry args={[0.06, 0.22, 8]} />
              <Mat color="#E85D75" />
            </mesh>
          </group>
        )}
      </group>

      {/* Phụ kiện thân */}
      {variant === "cat-office" && (
        <group>
          {/* Cổ áo trắng ôm gọn quanh cổ + cà vạt */}
          <mesh position={[0, 0.84, 0.18]} rotation={[0.55, 0, 0]}>
            <torusGeometry args={[0.145, 0.035, 8, 14]} />
            <Mat color={C.collar} />
          </mesh>
          <mesh castShadow position={[0, 0.62, 0.4]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.1, 0.22, 0.035]} />
            <Mat color={C.tie} />
          </mesh>
          <mesh castShadow position={[0, 0.74, 0.42]}>
            <boxGeometry args={[0.14, 0.08, 0.045]} />
            <Mat color={C.tie} />
          </mesh>
        </group>
      )}

      {variant === "rabbit-office" && (
        <group>
          <mesh position={[0, 0.84, 0.18]} rotation={[0.55, 0, 0]}>
            <torusGeometry args={[0.145, 0.035, 8, 14]} />
            <Mat color={C.collar} />
          </mesh>
          <mesh castShadow position={[0, 0.62, 0.4]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.1, 0.22, 0.035]} />
            <Mat color="#C96F4A" />
          </mesh>
          {/* Ly cà phê cầm trước bụng */}
          <mesh castShadow position={[0.3, 0.42, 0.3]}>
            <cylinderGeometry args={[0.07, 0.055, 0.12, 10]} />
            <Mat color={C.collar} />
          </mesh>
          <mesh position={[0.3, 0.485, 0.3]}>
            <cylinderGeometry args={[0.06, 0.06, 0.015, 10]} />
            <Mat color="#6B4A2F" />
          </mesh>
        </group>
      )}

      {variant === "cat-wizard" && (
        <group>
          {/* Áo choàng: nón cụt bao quanh thân */}
          <mesh castShadow position={[0, 0.42, -0.02]}>
            <cylinderGeometry args={[0.3, 0.5, 0.62, 14, 1, true]} />
            <Mat color={C.robe} />
          </mesh>
          {/* Gậy phép bên hông */}
          <group position={[-0.42, 0.55, 0.18]} rotation={[0, 0, 0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.028, 0.035, 0.85, 8]} />
              <Mat color={C.staff} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.075, 10, 10]} />
              <Mat color={C.orb} extra={{ emissive: C.orb, emissiveIntensity: 0.9, flatShading: false, roughness: 0.25 }} />
            </mesh>
          </group>
        </group>
      )}

      {variant === "cat-knight" && (
        <group>
          {/* Khiên cài trước bụng */}
          <mesh castShadow position={[0.26, 0.5, 0.34]} rotation={[0.1, -0.35, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.045, 6]} />
            <Mat color={C.metalDark} extra={{ metalness: 0.6, roughness: 0.4 }} />
          </mesh>
          <mesh position={[0.26, 0.5, 0.37]} rotation={[0.1, -0.35, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.055, 6]} />
            <Mat color={C.metal} extra={{ metalness: 0.75, roughness: 0.3 }} />
          </mesh>
        </group>
      )}
    </group>
  );
}

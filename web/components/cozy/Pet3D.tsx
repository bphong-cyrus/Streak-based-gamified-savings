"use client";

/**
 * Mô hình 3D cho 5 nhân vật — theo phong cách siêu chibi phẳng (tham khảo mẫu):
 * đầu cực to so với thân, viền nâu dày (#5B4A35), mắt tròn nâu đỏ to có đốm sáng,
 * mũi cam, má hồng to, bàn chân to trắng, không râu, mặt chia hai màu calico.
 * Hoạt họa: nhảy nhót nén/giãn, ngó nghiêng, lắc tai, vẫy đuôi, chớp mắt, giơ tay chào.
 */

import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export type PetVariant = "rabbit-office" | "cat-office" | "cat-farmer" | "cat-wizard" | "cat-knight";

const OUTLINE = "#5B4A35";
const C = {
  furCat: "#F5A94B",
  furCream: "#F8F1E4",
  furRabbit: "#FFF6E0",
  patchCream: "#FFF3E0", // mảng calico sáng trên mặt mèo cam
  patchTan: "#EED9BE", // mảng calico của thỏ
  belly: "#FFF6E0",
  bellyRabbit: "#FFFFFF",
  bellyKnight: "#C9D8E4",
  paw: "#FFF8EE",
  blush: "#FFA6B9",
  eye: "#4A2B2B", // nâu đỏ đặc trưng của mẫu
  nose: "#E87A5D",
  straw: "#E4C268",
  strawBand: "#8A6238",
  plaid: "#E2705C",
  overalls: "#57B8C7",
  overallsDark: "#3E97A6",
  wood: "#B98A5A",
  robe: "#4A90D9",
  robeDark: "#3A76B8",
  star: "#FFD166",
  armor: "#AEBEC9",
  armorDark: "#8FA6B5",
  shield: "#7FA8C9",
  blade: "#C9D8E4",
  tieGray: "#8A94A6",
  tieBlue: "#4A90D9",
  mug: "#FFFDF6",
  coffee: "#6B4A2F",
  orb: "#7FD4FF",
};

const PET: Record<
  PetVariant,
  { fur: string; belly: string; patch: string | null; longEars: boolean; bareEars: boolean }
> = {
  // bareEars = tai hở (không đội mũ) → render tai + mảng calico
  "cat-office": { fur: C.furCat, belly: C.belly, patch: C.patchCream, longEars: false, bareEars: true },
  "cat-farmer": { fur: C.furCream, belly: "#F5EFE2", patch: null, longEars: false, bareEars: false },
  "cat-wizard": { fur: C.furCat, belly: C.belly, patch: C.patchCream, longEars: false, bareEars: false },
  "cat-knight": { fur: C.furCream, belly: C.bellyKnight, patch: null, longEars: false, bareEars: false },
  "rabbit-office": { fur: C.furRabbit, belly: C.bellyRabbit, patch: C.patchTan, longEars: true, bareEars: true },
};

interface PartProps {
  color: string;
  geo: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  outline?: number;
  roughness?: number;
  doubleSide?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
}

/** Khối 3D kèm viền nâu dày kiểu mẫu: lớp BackSide phồng hơn bao ngoài. */
function Part({ color, geo, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, outline = 1.1, roughness = 0.92, doubleSide }: PartProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={outline} castShadow>
        {geo}
        <meshBasicMaterial color={OUTLINE} side={THREE.BackSide} />
      </mesh>
      <mesh castShadow>
        {geo}
        <meshStandardMaterial color={color} roughness={roughness} side={doubleSide ? THREE.DoubleSide : THREE.FrontSide} />
      </mesh>
    </group>
  );
}

/** Chi tiết nhỏ không viền (đồng tử, mũi, đốm sáng...). */
function Detail({ color, geo, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, emissive, emissiveIntensity = 0, roughness = 0.55 }: PartProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow>
      {geo}
      <meshStandardMaterial color={color} roughness={roughness} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

export interface Pet3DProps {
  variant: PetVariant;
  position?: [number, number, number];
  scale?: number;
  rotationY?: number;
  /** Nhịp hoạt họa lệch nhau giữa các con để không đồng bộ. */
  phase?: number;
}

/**
 * Mèo/thỏ 3D siêu chibi. Tổng cao ~1.6 gồm tai. Mặt hướng +z.
 * Đầu r 0.5 chiếm phần lớn silhouette; thân nhỏ; chân to trắng.
 */
export function Pet3D({ variant, position = [0, 0, 0], scale = 1, rotationY = 0, phase = 0 }: Pet3DProps) {
  const pet = PET[variant];
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const paw = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase * 3.71;
    const hop = Math.abs(Math.sin(t * 2.3));
    if (root.current) {
      root.current.position.y = position[1] + hop * 0.055;
      root.current.rotation.z = Math.sin(t * 2.3) * 0.025;
    }
    if (body.current) {
      const squash = 1 - (1 - hop) * 0.05;
      body.current.scale.set(1 + (1 - hop) * 0.05, squash, 1 + (1 - hop) * 0.05);
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 1.4) * 0.09;
      head.current.rotation.y = Math.sin(t * 0.6) * 0.28;
    }
    const wigL = Math.sin(t * 3.2) * 0.09;
    const wigR = Math.sin(t * 3.2 + 1.2) * 0.09;
    if (earL.current) {
      earL.current.rotation.z = (pet.longEars ? 0.14 : 0.22) + wigL;
      earL.current.rotation.x = Math.sin(t * 2.4) * 0.05;
    }
    if (earR.current) {
      earR.current.rotation.z = -(pet.longEars ? 0.14 : 0.22) + wigR;
      earR.current.rotation.x = Math.sin(t * 2.4 + 0.8) * 0.05;
    }
    if (tail.current) tail.current.rotation.x = -0.45 + Math.sin(t * 3.6) * 0.4;
    if (paw.current) paw.current.rotation.z = -0.7 + Math.sin(t * 4.2) * 0.4;
    const blink = Math.sin(t * 1.8) > 0.988 ? 0.12 : 1;
    if (eyes.current) eyes.current.scale.y = blink;
  });

  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Đuôi cong */}
      <group ref={tail} position={[0, 0.32, -0.22]}>
        {([0, 1, 2] as const).map((i) => (
          <Part
            key={i}
            color={pet.fur}
            position={[0, i === 0 ? 0 : 0.08 + i * 0.08, i === 0 ? 0 : -0.06 - i * 0.035]}
            outline={1.2}
            geo={<sphereGeometry args={[0.065 - i * 0.012, 10, 10]} />}
          />
        ))}
      </group>

      {/* Thân nhỏ (nhóm riêng để nén/giãn khi nhảy) */}
      <group ref={body}>
        <Part
          color={variant === "cat-farmer" ? C.plaid : variant === "cat-knight" ? C.armor : pet.fur}
          position={[0, 0.35, 0.05]}
          scale={[1, 1, 0.94]}
          outline={1.09}
          geo={<sphereGeometry args={[0.29, 20, 16]} />}
        />
        <Part color={pet.belly} position={[0, 0.34, 0.16]} scale={[0.78, 0.9, 0.55]} outline={1.12} geo={<sphereGeometry args={[0.185, 14, 12]} />} />
      </group>

      {/* Bàn chân to trắng — đặc trưng của mẫu */}
      <Part color={C.paw} position={[-0.16, 0.09, 0.2]} scale={[1, 0.7, 1.5]} outline={1.16} geo={<sphereGeometry args={[0.12, 12, 10]} />} />
      <Part color={C.paw} position={[0.16, 0.09, 0.2]} scale={[1, 0.7, 1.5]} outline={1.16} geo={<sphereGeometry args={[0.115, 12, 10]} />} />

      {/* Đầu cực to */}
      <group ref={head} position={[0, 0.76, 0.02]}>
        <Part color={pet.fur} geo={<sphereGeometry args={[0.47, 26, 22]} />} outline={1.06} />

        {/* Mảng calico nửa mặt bên phải — y chang mẫu */}
        {pet.patch && (
          <Part
            color={pet.patch}
            outline={1.02}
            geo={<sphereGeometry args={[0.478, 24, 20, -Math.PI / 2, Math.PI]} />}
          />
        )}

        {/* Tai to tròn (chỉ con không đội mũ) */}
        {pet.bareEars && (
          <>
            <group ref={earL} position={[-0.25, 0.3, -0.02]}>
              {pet.longEars ? (
                <>
                  <Part color={pet.fur} position={[0, 0.26, 0]} outline={1.1} geo={<capsuleGeometry args={[0.095, 0.34, 4, 12]} />} />
                  <Detail color={C.blush} position={[0, 0.26, 0.065]} scale={[0.55, 0.85, 0.5]} geo={<capsuleGeometry args={[0.085, 0.28, 4, 10]} />} roughness={0.8} />
                </>
              ) : (
                <>
                  <Part color={pet.fur} position={[0, 0.13, 0]} rotation={[0, 0, 0.05]} outline={1.12} geo={<coneGeometry args={[0.17, 0.34, 4]} />} />
                  <Detail color={C.blush} position={[0, 0.09, 0.08]} rotation={[0, 0, 0.05]} scale={[0.55, 0.72, 0.5]} geo={<coneGeometry args={[0.15, 0.26, 4]} />} roughness={0.8} />
                </>
              )}
            </group>
            <group ref={earR} position={[0.25, 0.3, -0.02]}>
              {pet.longEars ? (
                <>
                  <Part color={pet.fur} position={[0, 0.26, 0]} outline={1.1} geo={<capsuleGeometry args={[0.095, 0.34, 4, 12]} />} />
                  <Detail color={C.blush} position={[0, 0.26, 0.065]} scale={[0.55, 0.85, 0.5]} geo={<capsuleGeometry args={[0.085, 0.28, 4, 10]} />} roughness={0.8} />
                </>
              ) : (
                <>
                  <Part color={pet.fur} position={[0, 0.13, 0]} rotation={[0, 0, -0.05]} outline={1.12} geo={<coneGeometry args={[0.17, 0.34, 4]} />} />
                  <Detail color={C.blush} position={[0, 0.09, 0.08]} rotation={[0, 0, -0.05]} scale={[0.55, 0.72, 0.5]} geo={<coneGeometry args={[0.15, 0.26, 4]} />} roughness={0.8} />
                </>
              )}
            </group>
          </>
        )}

        {/* Mặt — mắt tròn nâu đỏ to, đốm sáng, mũi cam, miệng ω, má hồng to (theo mẫu) */}
        <group ref={eyes}>
          <Detail color={C.eye} position={[-0.17, 0.05, 0.415]} roughness={0.35} geo={<sphereGeometry args={[0.085, 14, 12]} />} />
          <Detail color={C.eye} position={[0.17, 0.05, 0.415]} roughness={0.35} geo={<sphereGeometry args={[0.085, 14, 12]} />} />
          <Detail color="#FFFFFF" position={[-0.143, 0.09, 0.463]} scale={0.55} roughness={0.3} geo={<sphereGeometry args={[0.032, 8, 8]} />} />
          <Detail color="#FFFFFF" position={[0.197, 0.09, 0.463]} scale={0.55} roughness={0.3} geo={<sphereGeometry args={[0.032, 8, 8]} />} />
        </group>
        <Detail color={C.nose} position={[0, -0.045, 0.448]} scale={[1.3, 0.85, 0.65]} roughness={0.6} geo={<sphereGeometry args={[0.042, 10, 8]} />} />
        <Detail color={OUTLINE} position={[-0.042, -0.115, 0.435]} rotation={[0, 0, Math.PI]} geo={<torusGeometry args={[0.038, 0.012, 8, 12, Math.PI]} />} roughness={0.5} />
        <Detail color={OUTLINE} position={[0.042, -0.115, 0.435]} rotation={[0, 0, Math.PI]} geo={<torusGeometry args={[0.038, 0.012, 8, 12, Math.PI]} />} roughness={0.5} />
        <Detail color={C.blush} position={[-0.28, -0.08, 0.325]} scale={[1.15, 0.72, 0.5]} roughness={0.85} geo={<sphereGeometry args={[0.062, 10, 8]} />} />
        <Detail color={C.blush} position={[0.28, -0.08, 0.325]} scale={[1.15, 0.72, 0.5]} roughness={0.85} geo={<sphereGeometry args={[0.062, 10, 8]} />} />

        {/* Mũ rơm nông dân */}
        {variant === "cat-farmer" && (
          <group position={[0, 0.28, 0]}>
            <Part color={C.straw} position={[0, 0.04, 0]} rotation={[0.04, 0, 0.03]} outline={1.1} geo={<cylinderGeometry args={[0.5, 0.52, 0.05, 20]} />} />
            <Part color={C.straw} position={[0, 0.16, 0]} rotation={[0.04, 0, 0.03]} outline={1.1} geo={<coneGeometry args={[0.3, 0.22, 16]} />} />
            <Detail color={C.strawBand} position={[0, 0.09, 0]} rotation={[0.04, 0, 0.03]} roughness={0.85} geo={<cylinderGeometry args={[0.3, 0.31, 0.06, 16]} />} />
          </group>
        )}

        {/* Mũ pháp sư */}
        {variant === "cat-wizard" && (
          <group position={[0, 0.27, 0]}>
            <Part color={C.robeDark} position={[0, 0.02, 0]} rotation={[0.08, 0, 0.06]} outline={1.1} geo={<cylinderGeometry args={[0.5, 0.52, 0.05, 20]} />} />
            <Part color={C.robe} position={[0, 0.28, 0]} rotation={[0.08, 0, 0.06]} outline={1.1} geo={<coneGeometry args={[0.28, 0.55, 16]} />} />
            <Detail color={C.robeDark} position={[0, 0.11, 0]} rotation={[0.08, 0, 0.06]} roughness={0.85} geo={<cylinderGeometry args={[0.31, 0.32, 0.065, 16]} />} />
            <Detail color={C.star} position={[0.1, 0.42, 0.17]} rotation={[0.4, 0.3, 0]} emissive={C.star} emissiveIntensity={0.5} geo={<octahedronGeometry args={[0.06]} />} />
            <Detail color={C.star} position={[-0.13, 0.2, 0.22]} emissive={C.star} emissiveIntensity={0.5} geo={<octahedronGeometry args={[0.042]} />} />
          </group>
        )}

        {/* Mũ giáp hiệp sĩ — che trán, hở mặt */}
        {variant === "cat-knight" && (
          <group>
            <Part color={C.armor} position={[0, 0.03, -0.02]} outline={1.05} roughness={0.55} geo={<sphereGeometry args={[0.49, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />} />
            <Part color={C.armor} position={[-0.37, 0.2, 0]} rotation={[0, 0, 0.5]} outline={1.12} roughness={0.55} geo={<coneGeometry args={[0.1, 0.26, 8]} />} />
            <Part color={C.armor} position={[0.37, 0.2, 0]} rotation={[0, 0, -0.5]} outline={1.12} roughness={0.55} geo={<coneGeometry args={[0.1, 0.26, 8]} />} />
            <Detail color={C.armorDark} position={[0, 0.22, 0.45]} rotation={[0.25, 0, 0]} roughness={0.55} geo={<boxGeometry args={[0.52, 0.11, 0.09]} />} />
            <Detail color={C.armorDark} position={[0, 0.02, 0.5]} roughness={0.55} geo={<boxGeometry args={[0.07, 0.18, 0.05]} />} />
          </group>
        )}
      </group>

      {/* Yếm nông dân */}
      {variant === "cat-farmer" && (
        <group>
          <Part color={C.overalls} position={[0, 0.34, 0.13]} scale={[0.92, 0.95, 0.62]} outline={1.06} geo={<sphereGeometry args={[0.272, 16, 12]} />} />
          <Detail color={C.overalls} position={[-0.11, 0.57, 0.18]} rotation={[0.22, 0, 0]} roughness={0.85} geo={<boxGeometry args={[0.06, 0.22, 0.025]} />} />
          <Detail color={C.overalls} position={[0.11, 0.57, 0.18]} rotation={[0.22, 0, 0]} roughness={0.85} geo={<boxGeometry args={[0.06, 0.22, 0.025]} />} />
          <Detail color={C.overallsDark} position={[0, 0.38, 0.27]} roughness={0.85} geo={<boxGeometry args={[0.11, 0.09, 0.025]} />} />
          <group position={[0.33, 0.4, 0.06]} rotation={[0, 0, -0.2]}>
            <Detail color={C.wood} position={[0, 0.08, 0]} roughness={0.85} geo={<cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />} />
            <Detail color={C.armorDark} position={[0, 0.5, 0]} roughness={0.6} geo={<cylinderGeometry args={[0.013, 0.013, 0.15, 6]} />} />
            <Detail color={C.armorDark} position={[-0.045, 0.47, 0]} rotation={[0, 0, 0.35]} roughness={0.6} geo={<cylinderGeometry args={[0.011, 0.011, 0.13, 6]} />} />
            <Detail color={C.armorDark} position={[0.045, 0.47, 0]} rotation={[0, 0, -0.35]} roughness={0.6} geo={<cylinderGeometry args={[0.011, 0.011, 0.13, 6]} />} />
          </group>
        </group>
      )}

      {/* Cà vạt */}
      {(variant === "cat-office" || variant === "rabbit-office") && (
        <group>
          <Detail color={variant === "cat-office" ? C.tieGray : C.tieBlue} position={[0, 0.55, 0.23]} rotation={[0.2, 0, 0]} roughness={0.8} geo={<boxGeometry args={[0.11, 0.08, 0.035]} />} />
          <Detail color={variant === "cat-office" ? C.tieGray : C.tieBlue} position={[0, 0.42, 0.25]} rotation={[0.12, 0, 0]} roughness={0.8} geo={<boxGeometry args={[0.08, 0.18, 0.03]} />} />
        </group>
      )}

      {/* Mèo công sở: cặp táp + giơ tay chào */}
      {variant === "cat-office" && (
        <group>
          <group ref={paw} position={[0.3, 0.5, 0.08]}>
            <Part color={C.paw} position={[0.05, 0.12, 0]} rotation={[0, 0, -0.5]} outline={1.18} geo={<capsuleGeometry args={[0.055, 0.14, 4, 10]} />} />
          </group>
          <group position={[-0.32, 0.2, 0.05]}>
            <Detail color={C.wood} roughness={0.85} geo={<boxGeometry args={[0.22, 0.16, 0.08]} />} />
            <Detail color={C.strawBand} position={[0, 0.12, 0]} roughness={0.85} geo={<torusGeometry args={[0.055, 0.014, 6, 10, Math.PI]} />} />
          </group>
        </group>
      )}

      {/* Thỏ cầm ly cà phê */}
      {variant === "rabbit-office" && (
        <group position={[0.26, 0.32, 0.18]}>
          <Detail color={C.mug} roughness={0.5} geo={<cylinderGeometry args={[0.07, 0.055, 0.12, 12]} />} />
          <Detail color={C.coffee} position={[0, 0.065, 0]} roughness={0.4} geo={<cylinderGeometry args={[0.06, 0.06, 0.014, 12]} />} />
          <Detail color={C.mug} position={[0.085, 0, 0]} rotation={[Math.PI / 2, 0, 0]} roughness={0.5} geo={<torusGeometry args={[0.042, 0.013, 6, 10]} />} />
        </group>
      )}

      {/* Pháp sư: áo choàng + gậy */}
      {variant === "cat-wizard" && (
        <group>
          <Part color={C.robe} position={[0, 0.33, 0.02]} outline={1.08} doubleSide geo={<cylinderGeometry args={[0.16, 0.35, 0.54, 16, 1, true]} />} />
          <Detail color={C.robeDark} position={[0, 0.58, 0.02]} rotation={[Math.PI / 2, 0, 0]} roughness={0.85} geo={<torusGeometry args={[0.145, 0.03, 8, 16]} />} />
          <Detail color={C.star} position={[0.15, 0.38, 0.22]} emissive={C.star} emissiveIntensity={0.5} geo={<octahedronGeometry args={[0.032]} />} />
          <group position={[-0.33, 0.36, 0.06]} rotation={[0, 0, 0.15]}>
            <Detail color={C.wood} position={[0, 0.08, 0]} roughness={0.85} geo={<cylinderGeometry args={[0.022, 0.027, 0.85, 8]} />} />
            <Detail color={C.orb} position={[0, 0.55, 0]} emissive={C.orb} emissiveIntensity={0.9} roughness={0.25} geo={<sphereGeometry args={[0.065, 12, 12]} />} />
          </group>
        </group>
      )}

      {/* Hiệp sĩ: khiên + kiếm */}
      {variant === "cat-knight" && (
        <group>
          <group position={[-0.33, 0.36, 0.1]} rotation={[0.1, 0.4, 0]}>
            <Part color={C.shield} rotation={[Math.PI / 2, 0, 0]} outline={1.14} roughness={0.55} geo={<cylinderGeometry args={[0.17, 0.17, 0.045, 6]} />} />
            <Detail color={C.blade} position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]} roughness={0.45} geo={<cylinderGeometry args={[0.08, 0.08, 0.02, 6]} />} />
          </group>
          <group position={[0.33, 0.42, 0.04]} rotation={[0, 0, -0.5]}>
            <Detail color={C.blade} position={[0, 0.18, 0]} roughness={0.4} geo={<boxGeometry args={[0.045, 0.3, 0.014]} />} />
            <Detail color={C.wood} position={[0, 0, 0]} roughness={0.85} geo={<boxGeometry args={[0.11, 0.028, 0.028]} />} />
            <Detail color={C.wood} position={[0, -0.07, 0]} roughness={0.85} geo={<cylinderGeometry args={[0.016, 0.016, 0.12, 6]} />} />
          </group>
        </group>
      )}
    </group>
  );
}

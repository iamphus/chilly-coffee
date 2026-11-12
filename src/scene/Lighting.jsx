import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Color, LinearSRGBColorSpace, Object3D, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import cafeMeta from '../../assets/cafe/cafe.meta.json'

/*
 * Ánh sáng ban ngày, chuyển từ bản thử (three r149) sang three mới.
 * - r149 nhân ngầm mọi cường độ đèn với π ("legacy lights"); three mới thì không,
 *   nên cường độ ở đây nhân LEGACY_SCALE để giữ độ sáng như cũ.
 * - r149 hiểu mã màu hex là giá trị tuyến tính; three mới hiểu là sRGB.
 *   Dùng linear() để màu đèn giữ đúng như bản thử.
 * - Ánh sáng phản chiếu (environment) chỉnh qua environmentIntensity của cả cảnh:
 *   three mới bỏ qua material.envMapIntensity khi dùng scene.environment.
 * - Ngân sách hiệu năng: chỉ 1 đèn đổ bóng (mặt trời). Bản thử có thêm 2 đèn spot đổ bóng.
 */
const LEGACY_SCALE = Math.PI

const linear = (hex) => new Color().setHex(hex, LinearSRGBColorSpace)

const DAY = {
  environment: 0.35,
  hemisphere: 0.45,
  sun: 0.75,
  spot: 0.7,
  lampMultiplier: 1,
}

const SUN = { position: [-6, 10, 3], target: [0, 0, -4.5] }
const SUN_SHADOW_EXTENT = 13

// Đèn rọi trần ở phòng chính và phòng lớn
const SPOTS = [
  [0, 3.15, 0.2],
  [0.6, 3.15, -9.4],
]

// Mỗi đèn trong cafe.meta.json: [x, y, z, cường độ, tầm chiếu, màu]
const LAMPS = cafeMeta.lights.map(([x, y, z, intensity, distance, color]) => ({
  position: [x, y, z],
  intensity,
  distance: distance || 5,
  color: linear(color || 0xffbf78),
}))

const HEMI_SKY = linear(0xffe9cc)
const HEMI_GROUND = linear(0x4a4038)
const SUN_COLOR = linear(0xfff4e0)
const SPOT_COLOR = linear(0xffd9a8)

/** Bản đồ phản chiếu dựng từ RoomEnvironment của three, không cần tải file ngoài. */
function useRoomEnvironmentMap() {
  const gl = useThree((state) => state.gl)

  const envMap = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const texture = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    return texture
  }, [gl])

  useEffect(() => () => envMap.dispose(), [envMap])

  return envMap
}

export default function Lighting({ preset = DAY }) {
  const envMap = useRoomEnvironmentMap()

  // Đèn hướng và đèn spot chiếu về "target"; target phải nằm trong cảnh mới cập nhật vị trí.
  const sunTarget = useMemo(() => new Object3D(), [])
  const spotTargets = useMemo(() => SPOTS.map(() => new Object3D()), [])

  return (
    <>
      <Environment map={envMap} environmentIntensity={preset.environment} />

      <hemisphereLight args={[HEMI_SKY, HEMI_GROUND, preset.hemisphere * LEGACY_SCALE]} />

      <primitive object={sunTarget} position={SUN.target} />
      <directionalLight
        color={SUN_COLOR}
        intensity={preset.sun * LEGACY_SCALE}
        position={SUN.position}
        target={sunTarget}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-SUN_SHADOW_EXTENT}
        shadow-camera-right={SUN_SHADOW_EXTENT}
        shadow-camera-top={SUN_SHADOW_EXTENT}
        shadow-camera-bottom={-SUN_SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />

      {SPOTS.map(([x, y, z], i) => (
        <group key={`spot-${i}`}>
          <primitive object={spotTargets[i]} position={[x, 0, z]} />
          <spotLight
            color={SPOT_COLOR}
            intensity={preset.spot * LEGACY_SCALE}
            position={[x, y, z]}
            target={spotTargets[i]}
            distance={9}
            angle={1.2}
            penumbra={0.6}
            decay={1.5}
          />
        </group>
      ))}

      {LAMPS.map((lamp, i) => (
        <pointLight
          key={`lamp-${i}`}
          color={lamp.color}
          intensity={lamp.intensity * preset.lampMultiplier * LEGACY_SCALE}
          position={lamp.position}
          distance={lamp.distance}
          decay={2}
        />
      ))}
    </>
  )
}

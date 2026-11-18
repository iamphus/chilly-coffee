import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Color, LinearSRGBColorSpace, Object3D } from 'three'
import cafeMeta from '../../assets/cafe/cafe.meta.json'
import { LIGHTING_PRESETS, SUN_TARGET } from './lightingPresets.js'
import { useRoomEnvironmentMap } from './useRoomEnvironmentMap.js'

/*
 * Ánh sáng cảnh 3D:
 * - Giữ TẤT CẢ nguồn sáng (kể cả đèn ánh trăng) luôn gắn trong cảnh từ khung hình đầu tiên, chỉ đổi cường độ về 0
 *   khi ban ngày. Nhờ đó số lượng đèn trong shader không bao giờ đổi → chuyển Ngày / Nắng chiều / Tối không bao giờ
 *   biên dịch lại shader WebGL (0 ms khựng).
 * - Ngân sách hiệu năng: chỉ 1 đèn đổ bóng (mặt trời ban ngày, tự chuyển thành ánh trăng bạc dịu vào ban đêm).
 */
const LEGACY_SCALE = Math.PI

const linear = (hex) => new Color().setHex(hex, LinearSRGBColorSpace)

const DEFAULT_SUN_POS = [-7.5, 13.8, 14.5]
const SUN_SHADOW_EXTENT = 17.5

const SPOTS = [
  [0, 3.15, 0.2],
  [0.6, 3.15, -9.4],
]

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
const MOON_COLOR = linear(0x9fb2ff)
const MOON = { position: [-14, 18, 20], target: [-2, 0, 6] }

export default function Lighting({ preset = LIGHTING_PRESETS.day, atmosphereRef = null, shadows = true }) {
  const envMap = useRoomEnvironmentMap()

  const sunTarget = useMemo(() => new Object3D(), [])
  const moonTarget = useMemo(() => new Object3D(), [])
  const spotTargets = useMemo(() => SPOTS.map(() => new Object3D()), [])

  const bgRef = useRef(null)
  const moonRef = useRef(null)
  const hemiRef = useRef(null)
  const sunRef = useRef(null)
  const spotRefs = useRef([])
  const lampRefs = useRef([])
  const lastVersionRef = useRef(-1)

  useFrame((state) => {
    const atmo = atmosphereRef?.current
    if (!atmo || lastVersionRef.current === atmo.version) return
    lastVersionRef.current = atmo.version

    const v = atmo.values
    const c = atmo.colors
    state.scene.environmentIntensity = v.environment
    bgRef.current?.copy(c.skyHorizon)
    if (moonRef.current) moonRef.current.intensity = v.moon * LEGACY_SCALE
    if (hemiRef.current) {
      hemiRef.current.intensity = v.hemisphere * LEGACY_SCALE
      hemiRef.current.color.copy(c.hemiSky)
    }
    if (sunRef.current) {
      sunRef.current.intensity = v.sun * LEGACY_SCALE
      sunRef.current.color.copy(c.sunColor)
      sunRef.current.position.set(atmo.sunPosition[0], atmo.sunPosition[1], atmo.sunPosition[2])
      sunRef.current.shadow.radius = v.shadowRadius || 1.8
    }
    for (let i = 0; i < spotRefs.current.length; i++) {
      if (spotRefs.current[i]) spotRefs.current[i].intensity = v.spot * LEGACY_SCALE
    }
    for (let i = 0; i < lampRefs.current.length; i++) {
      if (lampRefs.current[i]) lampRefs.current[i].intensity = LAMPS[i].intensity * v.lampMultiplier * LEGACY_SCALE
    }
  })

  const sunPos = preset.sunPosition ?? DEFAULT_SUN_POS

  return (
    <>
      <color ref={bgRef} attach="background" args={[preset.skyHorizon ?? preset.sky]} />

      {/* Luôn gắn đèn trăng (ban ngày intensity = 0) để NUM_DIR_LIGHTS cố định, không bao giờ biên dịch lại shader */}
      <primitive object={moonTarget} position={MOON.target} />
      <directionalLight
        ref={moonRef}
        color={MOON_COLOR}
        intensity={(preset.moon ?? 0) * LEGACY_SCALE}
        position={MOON.position}
        target={moonTarget}
      />

      <Environment map={envMap} environmentIntensity={preset.environment} />

      <hemisphereLight ref={hemiRef} args={[preset.hemiSky ?? HEMI_SKY, HEMI_GROUND, preset.hemisphere * LEGACY_SCALE]} />

      <primitive object={sunTarget} position={SUN_TARGET} />
      <directionalLight
        ref={sunRef}
        color={preset.sunColor ?? SUN_COLOR}
        intensity={preset.sun * LEGACY_SCALE}
        position={sunPos}
        target={sunTarget}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={preset.shadowRadius ?? 1.8}
        shadow-camera-left={-SUN_SHADOW_EXTENT}
        shadow-camera-right={SUN_SHADOW_EXTENT}
        shadow-camera-top={SUN_SHADOW_EXTENT}
        shadow-camera-bottom={-SUN_SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={55}
      />

      {SPOTS.map(([x, y, z], i) => (
        <group key={`spot-${i}`}>
          <primitive object={spotTargets[i]} position={[x, 0, z]} />
          <spotLight
            ref={(el) => {
              spotRefs.current[i] = el
            }}
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
          ref={(el) => {
            lampRefs.current[i] = el
          }}
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

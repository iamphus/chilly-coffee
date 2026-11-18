import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BackSide, BufferAttribute, Color, SphereGeometry } from 'three'
import { glowTexture } from '../glowTexture.js'
import { MOON_DIRECTION, SUN_TARGET } from '../lightingPresets.js'
import Instances from './Instances.jsx'

const RADIUS = 62 // nhỏ hơn camera.far (80); bầu trời luôn đi theo camera nên không bao giờ chạm tới
const SUN_DISTANCE = RADIUS - 7
const STAR_COUNT = 420

function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

const mixedScratch = new Color()
const topScratch = new Color()
const horizonScratch = new Color()

function paintSkyColors(geometry, topColor, horizonColor) {
  const positions = geometry.attributes.position
  const colorAttr = geometry.attributes.color
  const arr = colorAttr.array
  for (let i = 0; i < positions.count; i++) {
    const height = Math.max(0, positions.getY(i) / RADIUS)
    mixedScratch.copy(horizonColor).lerp(topColor, Math.pow(height, 0.55))
    arr[i * 3] = mixedScratch.r
    arr[i * 3 + 1] = mixedScratch.g
    arr[i * 3 + 2] = mixedScratch.b
  }
  colorAttr.needsUpdate = true
}

function sunSkyOffset(sunPosition) {
  const sp = sunPosition ?? [-7.5, 13.8, 14.5]
  const dx = sp[0] - SUN_TARGET[0]
  const dy = sp[1] - SUN_TARGET[1]
  const dz = sp[2] - SUN_TARGET[2]
  const len = Math.hypot(dx, dy, dz) || 1
  return [(dx / len) * SUN_DISTANCE, (dy / len) * SUN_DISTANCE, (dz / len) * SUN_DISTANCE]
}

const CLOUDS = (() => {
  const random = seeded(11)
  const blobs = []
  for (let c = 0; c < 9; c++) {
    const angle = random() * Math.PI * 2
    const distance = 26 + random() * 20
    const cx = Math.cos(angle) * distance
    const cz = Math.sin(angle) * distance
    const cy = 20 + random() * 10
    for (let b = 0; b < 5; b++) {
      const r = 2.2 + random() * 2.4
      blobs.push({ position: [cx + (b - 2) * 2.6, cy + random() * 1.2, cz + (random() - 0.5) * 3], scale: [r, r * 0.55, r] })
    }
  }
  return blobs
})()

/**
 * Bầu trời đi theo camera: dải màu chân trời → đỉnh trời, vầng mặt trời xoay theo đúng giờ nắng,
 * sao & trăng buổi tối, mây ban ngày / hồng cam lúc hoàng hôn.
 * Mọi lớp được gắn sẵn từ đầu (ẩn bằng visible khi opacity ≈ 0) để chuyển giờ mượt 60 fps không giật.
 */
export default function SkyDome({ preset, atmosphereRef = null }) {
  const group = useRef(null)
  const starsRef = useRef(null)
  const sunHaloRef = useRef(null)
  const sunDiscRef = useRef(null)
  const moonHaloRef = useRef(null)
  const moonDiscRef = useRef(null)
  const cloudsRef = useRef(null)
  const lastVersionRef = useRef(-1)

  const sphere = useMemo(() => {
    const geometry = new SphereGeometry(RADIUS, 32, 16)
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3))
    return geometry
  }, [])

  useEffect(() => {
    if (atmosphereRef?.current) return
    paintSkyColors(sphere, topScratch.set(preset.skyTop), horizonScratch.set(preset.skyHorizon))
  }, [atmosphereRef, preset.skyHorizon, preset.skyTop, sphere])

  const stars = useMemo(() => {
    const random = seeded(7)
    const positions = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = random() * Math.PI * 2
      const height = 0.12 + random() * 0.88
      const ring = Math.sqrt(1 - height * height)
      positions.set([Math.cos(angle) * ring * (RADIUS - 2), height * (RADIUS - 2), Math.sin(angle) * ring * (RADIUS - 2)], i * 3)
    }
    return positions
  }, [])

  useFrame(({ camera }) => {
    group.current?.position.copy(camera.position)
    const atmo = atmosphereRef?.current
    if (!atmo || lastVersionRef.current === atmo.version) return
    lastVersionRef.current = atmo.version

    paintSkyColors(sphere, atmo.colors.skyTop, atmo.colors.skyHorizon)

    const sunVis = atmo.values.sunGlow
    const [sx, sy, sz] = sunSkyOffset(atmo.sunPosition)
    if (sunHaloRef.current) {
      sunHaloRef.current.visible = sunVis > 0.004
      sunHaloRef.current.position.set(sx, sy, sz)
      sunHaloRef.current.material.opacity = 0.52 * sunVis
      sunHaloRef.current.material.color.copy(atmo.colors.sunColor)
    }
    if (sunDiscRef.current) {
      sunDiscRef.current.visible = sunVis > 0.004
      sunDiscRef.current.position.set(sx, sy, sz)
      sunDiscRef.current.material.opacity = 0.95 * sunVis
    }

    const starVis = atmo.values.stars
    if (starsRef.current) {
      starsRef.current.visible = starVis > 0.004
      starsRef.current.material.opacity = 0.85 * starVis
    }
    if (moonHaloRef.current) {
      moonHaloRef.current.visible = starVis > 0.004
      moonHaloRef.current.material.opacity = 0.45 * starVis
    }
    if (moonDiscRef.current) {
      moonDiscRef.current.visible = starVis > 0.004
      moonDiscRef.current.material.opacity = starVis
    }

    const cloudVis = atmo.values.clouds
    if (cloudsRef.current) {
      cloudsRef.current.visible = cloudVis > 0.004
      cloudsRef.current.material.opacity = cloudVis
      cloudsRef.current.material.color.copy(atmo.colors.cloudColor)
      cloudsRef.current.material.emissive.copy(atmo.colors.cloudColor)
    }
  })

  const sun = sunSkyOffset(preset.sunPosition)
  const moon = MOON_DIRECTION.map((value) => value * (RADIUS - 6))
  const initSunGlow = preset.sunGlow ?? 0
  const initSunColor = preset.sunColor ?? '#fff4e0'
  const initStars = preset.stars ?? 0
  const initClouds = preset.clouds ?? 0
  const initCloudColor = preset.cloudColor ?? '#ffffff'

  return (
    <>
      <group ref={group}>
        <mesh geometry={sphere} renderOrder={-10}>
          <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
        </mesh>

        <points ref={starsRef} visible={initStars > 0.004} renderOrder={-9}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#fff6e0"
            size={1.6}
            sizeAttenuation={false}
            transparent
            opacity={0.85 * initStars}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </points>

        <sprite ref={sunHaloRef} visible={initSunGlow > 0.004} position={sun} scale={28} renderOrder={-8}>
          <spriteMaterial
            map={glowTexture()}
            color={initSunColor}
            transparent
            opacity={0.52 * initSunGlow}
            blending={AdditiveBlending}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <sprite ref={sunDiscRef} visible={initSunGlow > 0.004} position={sun} scale={5.2} renderOrder={-7}>
          <spriteMaterial
            map={glowTexture()}
            color="#fffdf2"
            transparent
            opacity={0.95 * initSunGlow}
            blending={AdditiveBlending}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        <sprite ref={moonHaloRef} visible={initStars > 0.004} position={moon} scale={16} renderOrder={-8}>
          <spriteMaterial
            map={glowTexture()}
            color="#9fb2ff"
            transparent
            opacity={0.45 * initStars}
            blending={AdditiveBlending}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <sprite ref={moonDiscRef} visible={initStars > 0.004} position={moon} scale={4.2} renderOrder={-7}>
          <spriteMaterial
            map={glowTexture()}
            color="#fff8e6"
            transparent
            opacity={initStars}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>

      <Instances
        ref={cloudsRef}
        items={CLOUDS}
        material={{
          color: initCloudColor,
          emissive: initCloudColor,
          emissiveIntensity: 0.35,
          roughness: 1,
          flatShading: true,
          fog: false,
          transparent: true,
          opacity: initClouds,
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
      </Instances>
    </>
  )
}

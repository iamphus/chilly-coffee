import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BackSide, BufferAttribute, Color, SphereGeometry } from 'three'
import { glowTexture } from '../glowTexture.js'
import Instances from './Instances.jsx'

const RADIUS = 62 // nhỏ hơn camera.far (80); bầu trời luôn đi theo camera nên không bao giờ chạm tới
const MOON_DIRECTION = [-0.45, 0.42, 0.79] // cùng phía với ánh trăng trong Lighting.jsx
const STAR_COUNT = 420

function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

/** Bầu trời chuyển màu từ chân trời lên đỉnh (màu theo đỉnh của hình cầu), không bị sương che. */
function useGradientSphere(top, horizon) {
  return useMemo(() => {
    const geometry = new SphereGeometry(RADIUS, 32, 16)
    const positions = geometry.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const topColor = new Color(top)
    const horizonColor = new Color(horizon)
    const mixed = new Color()
    for (let i = 0; i < positions.count; i++) {
      const height = Math.max(0, positions.getY(i) / RADIUS) // dưới chân trời giữ màu chân trời
      mixed.copy(horizonColor).lerp(topColor, Math.pow(height, 0.55))
      mixed.toArray(colors, i * 3)
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    return geometry
  }, [top, horizon])
}

function useStars() {
  return useMemo(() => {
    const random = seeded(7)
    const positions = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = random() * Math.PI * 2
      const height = 0.12 + random() * 0.88 // chỉ nửa trên bầu trời
      const ring = Math.sqrt(1 - height * height)
      positions.set([Math.cos(angle) * ring * (RADIUS - 2), height * (RADIUS - 2), Math.sin(angle) * ring * (RADIUS - 2)], i * 3)
    }
    return positions
  }, [])
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

/** Bầu trời đi theo camera: dải màu, sao và trăng buổi tối, mây ban ngày. */
export default function SkyDome({ preset }) {
  const group = useRef(null)
  const sphere = useGradientSphere(preset.skyTop, preset.skyHorizon)
  const stars = useStars()

  useFrame(({ camera }) => group.current?.position.copy(camera.position))

  const moon = MOON_DIRECTION.map((value) => value * (RADIUS - 6))

  return (
    <>
      <group ref={group}>
        <mesh geometry={sphere} renderOrder={-10}>
          <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
        </mesh>

        {preset.stars > 0 && (
          <>
            <points renderOrder={-9}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[stars, 3]} />
              </bufferGeometry>
              <pointsMaterial color="#fff6e0" size={1.6} sizeAttenuation={false} transparent opacity={0.85 * preset.stars} fog={false} depthWrite={false} toneMapped={false} />
            </points>
            {/* Trăng: quầng sáng lớn + đĩa sáng nhỏ */}
            <sprite position={moon} scale={16} renderOrder={-8}>
              <spriteMaterial map={glowTexture()} color="#9fb2ff" transparent opacity={0.45} blending={AdditiveBlending} fog={false} depthWrite={false} toneMapped={false} />
            </sprite>
            <sprite position={moon} scale={4.2} renderOrder={-7}>
              <spriteMaterial map={glowTexture()} color="#fff8e6" transparent opacity={1} fog={false} depthWrite={false} toneMapped={false} />
            </sprite>
          </>
        )}
      </group>

      {preset.clouds > 0 && (
        <Instances items={CLOUDS} material={{ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 1, flatShading: true, fog: false, transparent: true, opacity: preset.clouds }}>
          <icosahedronGeometry args={[1, 1]} />
        </Instances>
      )}
    </>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { glowTexture } from '../glowTexture.js'
import Instances from './Instances.jsx'
import { FOUNTAIN, POND, lilyPads, reeds, rimStones } from './layout.js'

const STONE = { color: '#cfc8bb', roughness: 0.85, flatShading: true }
const WATER = { color: '#4f9cc0', roughness: 0.12, metalness: 0.1, emissive: '#1d4d66', emissiveIntensity: 0.25 }
const SPRAY_COUNT = 90
const SPRAY_TOP = 1.55
const SPRAY_PERIOD = 1.6 // giây một giọt bay lên rồi rơi xuống

/** Tia nước của đài phun: các giọt bay theo đường parabol từ đỉnh ra mép bát trên. */
function Spray({ opacity }) {
  const points = useRef(null)
  const { geometry, seeds } = useMemo(() => {
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(new Float32Array(SPRAY_COUNT * 3), 3))
    return { geometry: buffer, seeds: Array.from({ length: SPRAY_COUNT }, (_, i) => [(i / SPRAY_COUNT) * Math.PI * 2 * 7, i / SPRAY_COUNT]) }
  }, [])

  useFrame(({ clock }) => {
    const positions = points.current?.geometry.attributes.position
    if (!positions) return
    seeds.forEach(([angle, offset], i) => {
      const t = (clock.elapsedTime / SPRAY_PERIOD + offset) % 1
      const reach = 0.62 * t
      positions.setXYZ(i, Math.cos(angle) * reach, SPRAY_TOP + 0.35 * t - 0.75 * t * t, Math.sin(angle) * reach)
    })
    positions.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={glowTexture()} color="#cfefff" size={0.12} sizeAttenuation transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  )
}

/** Đài phun nước giữa công viên trước và hồ sen trong vườn bên hẻm. */
export default function WaterFeatures() {
  const lilyItems = useMemo(() => lilyPads.map(({ position, scale }) => ({ position, scale: [scale, 0.02, scale], rotationY: position[0] * 7 })), [])
  const lotus = useMemo(
    () => lilyPads.filter((pad) => pad.flower).map(({ position: [x, y, z], scale }) => ({ position: [x + scale * 0.2, y + 0.07, z], scale: 0.08, color: '#f7a8c8' })),
    [],
  )
  const reedItems = useMemo(
    () => reeds.map(({ position: [x, , z], height }) => ({ position: [x, height / 2, z], scale: [0.025, height, 0.025] })),
    [],
  )

  return (
    <>
      {/* Đài phun nước */}
      <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}>
        <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[FOUNTAIN.basin, FOUNTAIN.basin + 0.1, 0.44, 32]} />
          <meshStandardMaterial {...STONE} />
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[FOUNTAIN.basin - 0.14, 32]} />
          <meshStandardMaterial {...WATER} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.24, 0.8, 12]} />
          <meshStandardMaterial {...STONE} />
        </mesh>
        <mesh position={[0, 1.18, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.32, 0.18, 24]} />
          <meshStandardMaterial {...STONE} />
        </mesh>
        <mesh position={[0, 1.272, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.64, 24]} />
          <meshStandardMaterial {...WATER} />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshStandardMaterial {...STONE} />
        </mesh>
        <Spray opacity={0.75} />
      </group>

      {/* Hồ sen */}
      <mesh position={[POND.x, 0.03, POND.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[POND.radius, 40]} />
        <meshStandardMaterial {...WATER} />
      </mesh>
      <Instances items={rimStones} material={STONE}>
        <dodecahedronGeometry args={[1, 0]} />
      </Instances>
      <Instances items={lilyItems} material={{ color: '#4f8f3e', roughness: 0.7 }}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
      </Instances>
      <Instances items={lotus} material={{ roughness: 0.7, flatShading: true, emissive: '#ff9cc3', emissiveIntensity: 0.1 }}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>
      <Instances items={reedItems} material={{ color: '#7d9a4a', roughness: 1 }}>
        <cylinderGeometry args={[0.3, 1, 1, 4]} />
      </Instances>
    </>
  )
}

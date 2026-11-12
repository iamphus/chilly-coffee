import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { glowTexture } from './glowTexture.js'

// Hạt bụi sáng bay chậm trong quán, bắt ánh đèn vàng. Hai vùng: phòng chính và phòng làm việc lớn.
const ROOMS = [
  { min: [-3.4, 0.4, -2.4], max: [3.0, 2.4, 2.7], count: 90 },
  { min: [-3.0, 0.4, -12.4], max: [3.0, 2.4, -6.6], count: 70 },
]
const DRIFT = 0.12 // m: biên độ trôi
const SPEED = 0.25

function seededRandom(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

export default function DustMotes({ opacity }) {
  const points = useRef(null)
  const { geometry, base, phases } = useMemo(() => {
    const random = seededRandom(42)
    const total = ROOMS.reduce((sum, room) => sum + room.count, 0)
    const basePositions = new Float32Array(total * 3)
    const phase = new Float32Array(total)
    let i = 0
    for (const room of ROOMS) {
      for (let n = 0; n < room.count; n++, i++) {
        for (let axis = 0; axis < 3; axis++) {
          basePositions[i * 3 + axis] = room.min[axis] + random() * (room.max[axis] - room.min[axis])
        }
        phase[i] = random() * Math.PI * 2
      }
    }
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(basePositions.slice(), 3))
    return { geometry: buffer, base: basePositions, phases: phase }
  }, [])

  useFrame(({ clock }) => {
    if (!points.current) return
    const t = clock.elapsedTime * SPEED
    const positions = points.current.geometry.attributes.position
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i]
      positions.array[i * 3] = base[i * 3] + Math.sin(t + p) * DRIFT
      positions.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + p * 1.3) * DRIFT
      positions.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.8 + p) * DRIFT
    }
    positions.needsUpdate = true
  })

  if (opacity <= 0) return null
  return (
    <points ref={points} geometry={geometry} renderOrder={3}>
      <pointsMaterial
        map={glowTexture()}
        color="#ffd9a8"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

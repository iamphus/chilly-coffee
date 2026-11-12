import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { glowTexture } from '../glowTexture.js'
import { fireflyAreas } from './layout.js'

const PER_AREA = 70
const DRIFT = 0.6

/** Đom đóm buổi tối: chấm vàng xanh bay lượn và nhấp nháy trong hai công viên. */
export default function Fireflies({ opacity }) {
  const points = useRef(null)
  const { geometry, base, phases } = useMemo(() => {
    let seed = 99
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const total = fireflyAreas.length * PER_AREA
    const basePositions = new Float32Array(total * 3)
    const phase = new Float32Array(total)
    fireflyAreas.forEach(({ min, max }, area) => {
      for (let n = 0; n < PER_AREA; n++) {
        const i = area * PER_AREA + n
        for (let axis = 0; axis < 3; axis++) basePositions[i * 3 + axis] = min[axis] + random() * (max[axis] - min[axis])
        phase[i] = random() * Math.PI * 2
      }
    })
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(basePositions.slice(), 3))
    return { geometry: buffer, base: basePositions, phases: phase }
  }, [])

  useFrame(({ clock }) => {
    const positions = points.current?.geometry.attributes.position
    if (!positions) return
    const t = clock.elapsedTime * 0.35
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i]
      positions.array[i * 3] = base[i * 3] + Math.sin(t + p) * DRIFT
      positions.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 1.7 + p * 2) * 0.25
      positions.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.9 + p) * DRIFT
    }
    positions.needsUpdate = true
    points.current.material.opacity = opacity * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.3))
  })

  if (opacity <= 0) return null
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={glowTexture()} color="#e6ff8a" size={0.14} sizeAttenuation transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  )
}

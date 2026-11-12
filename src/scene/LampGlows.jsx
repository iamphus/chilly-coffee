import { useMemo } from 'react'
import { AdditiveBlending, Color } from 'three'
import cafeMeta from '../../assets/cafe/cafe.meta.json'
import { glowTexture } from './glowTexture.js'

// Quầng sáng giả quanh mỗi đèn trong quán (sprite cộng sáng): rẻ hơn nhiều so với hiệu ứng bloom.
const BASE_SIZE = 0.45
const SIZE_PER_INTENSITY = 0.25

export default function LampGlows({ strength }) {
  const lamps = useMemo(
    () =>
      cafeMeta.lights.map(([x, y, z, intensity, , color]) => ({
        position: [x, y, z],
        size: BASE_SIZE + intensity * SIZE_PER_INTENSITY,
        color: new Color(color || 0xffbf78),
      })),
    [],
  )
  if (strength <= 0) return null
  return lamps.map((lamp, index) => (
    <sprite key={index} position={lamp.position} scale={lamp.size} renderOrder={2}>
      <spriteMaterial
        map={glowTexture()}
        color={lamp.color}
        transparent
        opacity={strength}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  ))
}

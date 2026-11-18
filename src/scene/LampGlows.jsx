import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color } from 'three'
import cafeMeta from '../../assets/cafe/cafe.meta.json'
import { glowTexture } from './glowTexture.js'

const BASE_SIZE = 0.45
const SIZE_PER_INTENSITY = 0.25

export default function LampGlows({ strength = 0.2, atmosphereRef = null }) {
  const spriteRefs = useRef([])
  const lastVersionRef = useRef(-1)
  const lamps = useMemo(
    () =>
      cafeMeta.lights.map(([x, y, z, intensity, , color]) => ({
        position: [x, y, z],
        size: BASE_SIZE + intensity * SIZE_PER_INTENSITY,
        color: new Color(color || 0xffbf78),
      })),
    [],
  )

  useFrame(() => {
    const atmo = atmosphereRef?.current
    if (!atmo || lastVersionRef.current === atmo.version) return
    lastVersionRef.current = atmo.version
    const opacity = atmo.values.lampGlow
    for (const sprite of spriteRefs.current) {
      if (!sprite) continue
      sprite.visible = opacity > 0.004
      sprite.material.opacity = opacity
    }
  })

  return lamps.map((lamp, index) => (
    <sprite
      key={index}
      ref={(el) => {
        spriteRefs.current[index] = el
      }}
      position={lamp.position}
      scale={lamp.size}
      renderOrder={2}
    >
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

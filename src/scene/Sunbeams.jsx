import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  SRGBColorSpace,
} from 'three'
import { QUAD_COUNT, VERT_COUNT, fillSunbeamBuffers } from './sunbeamMath.js'

let cachedBeamTexture = null

function sunbeamTexture() {
  if (cachedBeamTexture) return cachedBeamTexture
  const w = 128
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  const data = img.data

  for (let y = 0; y < h; y++) {
    // v = 0 sát mặt kính, v = 1 hướng xuống sàn nhà (Canvas lật trục Y trong Three.js nên y=0 là v=1)
    const v = 1 - y / (h - 1)
    const entry = v < 0.09 ? (v / 0.09) * (v / 0.09) * (3 - 2 * (v / 0.09)) : 1
    const falloff = Math.pow(Math.max(0, 1 - v), 1.65)
    const along = entry * falloff

    for (let x = 0; x < w; x++) {
      const u = x / (w - 1)
      const edge = Math.pow(Math.sin(Math.PI * u), 1.35)
      const streaks = 0.82 + 0.18 * Math.sin(u * Math.PI * 5) * Math.cos(u * Math.PI * 2.5)
      const alpha = Math.round(255 * Math.min(1, along * edge * streaks))
      const idx = (y * w + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = alpha
    }
  }

  ctx.putImageData(img, 0, 0)
  cachedBeamTexture = new CanvasTexture(canvas)
  cachedBeamTexture.colorSpace = SRGBColorSpace
  return cachedBeamTexture
}

const initColorScratch = new Color()

/**
 * Luồng tia nắng xiên qua các ô cửa kính của phòng chính & phòng học lớn.
 * Hướng nghiêng, chiều dài chạm sàn và sắc độ vàng cam cập nhật mượt theo mặt trời từng phút (1 draw call duy nhất).
 */
export default function Sunbeams({ preset, atmosphereRef = null }) {
  const meshRef = useRef(null)
  const lastVersionRef = useRef(-1)

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(VERT_COUNT * 3)
    const colors = new Float32Array(VERT_COUNT * 3)
    const uvs = new Float32Array(VERT_COUNT * 2)
    const indices = new Uint16Array(QUAD_COUNT * 6)

    for (let q = 0; q < QUAD_COUNT; q++) {
      const v = q * 4
      uvs.set([0, 0, 1, 0, 1, 1, 0, 1], q * 8)
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], q * 6)
    }

    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.setAttribute('uv', new BufferAttribute(uvs, 2))
    geo.setIndex(new BufferAttribute(indices, 1))
    return geo
  }, [])

  useEffect(() => {
    if (atmosphereRef?.current || !meshRef.current) return
    const posAttr = meshRef.current.geometry.attributes.position
    const colAttr = meshRef.current.geometry.attributes.color
    const lit = fillSunbeamBuffers(
      posAttr.array,
      colAttr.array,
      preset.sunPosition,
      initColorScratch.set(preset.sunColor ?? '#fff4e0'),
      preset.sunbeam ?? 0,
    )
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    meshRef.current.visible = lit > 0
  }, [atmosphereRef, preset.sunColor, preset.sunPosition, preset.sunbeam])

  useFrame(() => {
    const atmo = atmosphereRef?.current
    const node = meshRef.current
    if (!atmo || !node || lastVersionRef.current === atmo.version) return
    lastVersionRef.current = atmo.version

    const posAttr = node.geometry.attributes.position
    const colAttr = node.geometry.attributes.color
    const lit = fillSunbeamBuffers(
      posAttr.array,
      colAttr.array,
      atmo.sunPosition,
      atmo.colors.sunColor,
      atmo.values.sunbeam,
    )
    node.visible = lit > 0
    if (lit > 0) {
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} visible={(preset.sunbeam ?? 0) > 0.004} frustumCulled={false} renderOrder={2}>
      <meshBasicMaterial
        map={sunbeamTexture()}
        vertexColors
        transparent
        side={DoubleSide}
        blending={AdditiveBlending}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}

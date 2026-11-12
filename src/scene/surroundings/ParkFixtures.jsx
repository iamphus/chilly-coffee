import { useMemo } from 'react'
import { AdditiveBlending, CircleGeometry } from 'three'
import { glowTexture } from '../glowTexture.js'
import Instances from './Instances.jsx'
import { benches, lamps } from './layout.js'

const POLE_HEIGHT = 3
const HEAD_Y = POLE_HEIGHT + 0.15
const LIGHT_POOL_RADIUS = 2.4

/** Toạ độ thế giới của một điểm (dx, dy, dz) trong hệ toạ độ ghế (xoay quanh trục y). */
function local({ position: [x, y, z], rotationY }, dx, dy, dz) {
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  return [x + dx * cos + dz * sin, y + dy, z - dx * sin + dz * cos]
}

/** Đèn công viên (cột, bóng đèn tự sáng, quầng sáng, vệt sáng dưới đất) và ghế gỗ. */
export default function ParkFixtures({ preset }) {
  const poles = useMemo(() => lamps.map(({ position: [x, , z] }) => ({ position: [x, POLE_HEIGHT / 2, z], scale: [0.06, POLE_HEIGHT, 0.06] })), [])
  const heads = useMemo(() => lamps.map(({ position: [x, , z] }) => ({ position: [x, HEAD_Y, z], scale: [0.17, 0.3, 0.17] })), [])
  const caps = useMemo(() => lamps.map(({ position: [x, , z] }) => ({ position: [x, HEAD_Y + 0.24, z], scale: [0.24, 0.18, 0.24] })), [])
  const pools = useMemo(() => lamps.map(({ position: [x, , z] }) => ({ position: [x, 0.02, z], scale: LIGHT_POOL_RADIUS })), [])
  const glowPoints = useMemo(() => new Float32Array(lamps.flatMap(({ position: [x, , z] }) => [x, HEAD_Y, z])), [])
  const poolGeometry = useMemo(() => new CircleGeometry(1, 32).rotateX(-Math.PI / 2), [])

  // Ghế: mặt ghế + tựa lưng (gỗ), 2 chân (sắt)
  const benchWood = useMemo(
    () =>
      benches.flatMap((bench) => [
        { position: local(bench, 0, 0.45, 0), scale: [1.5, 0.06, 0.45], rotationY: bench.rotationY },
        { position: local(bench, 0, 0.72, -0.21), scale: [1.5, 0.36, 0.05], rotationY: bench.rotationY },
      ]),
    [],
  )
  const benchLegs = useMemo(
    () => benches.flatMap((bench) => [-0.6, 0.6].map((dx) => ({ position: local(bench, dx, 0.32, -0.02), scale: [0.07, 0.64, 0.46], rotationY: bench.rotationY }))),
    [],
  )

  return (
    <>
      <Instances items={poles} material={{ color: '#2e3a33', roughness: 0.5, metalness: 0.5 }} castShadow>
        <cylinderGeometry args={[1, 1.3, 1, 8]} />
      </Instances>
      <Instances items={caps} material={{ color: '#2e3a33', roughness: 0.5, metalness: 0.5 }}>
        <coneGeometry args={[1, 1, 8]} />
      </Instances>
      <Instances items={heads} material={{ color: '#fff1d6', emissive: '#ffcf8a', emissiveIntensity: preset.lampHead, toneMapped: false }}>
        <cylinderGeometry args={[1, 0.8, 1, 8]} />
      </Instances>

      {preset.lampGlow > 0 && (
        <>
          <points renderOrder={3}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[glowPoints, 3]} />
            </bufferGeometry>
            <pointsMaterial map={glowTexture()} color="#ffc98a" size={2.2} sizeAttenuation transparent opacity={preset.lampGlow} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </points>
          {/* Vệt sáng giả dưới chân đèn: rẻ hơn rất nhiều so với đèn thật */}
          <Instances items={pools} basic renderOrder={1} material={{ map: glowTexture(), color: '#ffb866', transparent: true, opacity: preset.lampGlow * 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }}>
            <primitive object={poolGeometry} attach="geometry" />
          </Instances>
        </>
      )}

      <Instances items={benchWood} material={{ color: '#9a6a43', roughness: 0.8 }} castShadow>
        <boxGeometry />
      </Instances>
      <Instances items={benchLegs} material={{ color: '#2e3a33', roughness: 0.5, metalness: 0.5 }}>
        <boxGeometry />
      </Instances>
    </>
  )
}

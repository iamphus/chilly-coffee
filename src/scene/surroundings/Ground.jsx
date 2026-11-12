import { useMemo } from 'react'
import { CircleGeometry, RingGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import Instances from './Instances.jsx'
import { HEDGE, curbs, flowerBeds, hedges, paths, plazas, roadMarks, roads, steppingStones } from './layout.js'

const GROUND_RADIUS = 92 // xa hơn tầm sương (78) nên mép cỏ không bao giờ lộ
const flat = (geometry) => geometry.rotateX(-Math.PI / 2)

/** Mặt đất: bãi cỏ lớn, đường, bó vỉa, hàng rào cây, lối đi lát gạch, đất bồn hoa. */
export default function Ground() {
  const grass = useMemo(() => flat(new CircleGeometry(GROUND_RADIUS, 48)), [])
  const hedgeGeometry = useMemo(() => new RoundedBoxGeometry(HEDGE.length, HEDGE.height, HEDGE.depth, 3, 0.2), [])
  const plazaGeometries = useMemo(() => plazas.map(({ radius }) => flat(new CircleGeometry(radius, 48))), [])
  const rings = useMemo(
    () =>
      flowerBeds
        .filter((bed) => bed.type === 'ring')
        .map((bed) => ({ position: bed.position, geometry: flat(new RingGeometry(bed.inner, bed.outer, 56, 1)) })),
    [],
  )
  const boxBeds = useMemo(() => flowerBeds.filter((bed) => bed.type === 'box'), [])

  return (
    <>
      {/* Thấp hơn mặt đường gốc (−0,01) một chút để không nhấp nháy chồng lên */}
      <mesh geometry={grass} position={[0, -0.03, -4]} receiveShadow>
        <meshStandardMaterial color="#7fae67" roughness={1} />
      </mesh>

      <Instances items={roads} material={{ color: '#4a4a4f', roughness: 0.95 }} receiveShadow>
        <boxGeometry />
      </Instances>
      <Instances items={roadMarks} material={{ color: '#e9e4d6', roughness: 0.8 }}>
        <boxGeometry />
      </Instances>
      <Instances items={curbs} material={{ color: '#c9c3b8', roughness: 0.9 }} receiveShadow>
        <boxGeometry />
      </Instances>
      <Instances items={hedges} material={{ roughness: 1 }}>
        <primitive object={hedgeGeometry} attach="geometry" />
      </Instances>

      {plazaGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position={plazas[index].position} receiveShadow>
          <meshStandardMaterial color="#d9c7a7" roughness={0.9} />
        </mesh>
      ))}
      <Instances items={paths} material={{ color: '#d9c7a7', roughness: 0.9 }} receiveShadow>
        <boxGeometry />
      </Instances>
      <Instances items={steppingStones} material={{ color: '#bdb6aa', roughness: 0.9, flatShading: true }}>
        <cylinderGeometry args={[1, 1, 1, 7]} />
      </Instances>

      {rings.map(({ position, geometry }, index) => (
        <mesh key={index} geometry={geometry} position={position}>
          <meshStandardMaterial color="#5b4334" roughness={1} />
        </mesh>
      ))}
      <Instances items={boxBeds} material={{ color: '#5b4334', roughness: 1 }}>
        <boxGeometry />
      </Instances>
    </>
  )
}

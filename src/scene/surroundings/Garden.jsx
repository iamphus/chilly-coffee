import { useMemo } from 'react'
import Instances from './Instances.jsx'
import { canopies, flowerLeaves, flowers, hills, pines, trunks } from './layout.js'

/** Hoa, cây (tán tròn, cây hoa, thông) và đồi xa. Mỗi loại một lần vẽ. */
export default function Garden() {
  const trunkItems = useMemo(
    () => trunks.map(({ position, height, radius }) => ({ position, scale: [radius, height, radius] })),
    [],
  )
  const pineItems = useMemo(
    () => pines.map(({ position, height, radius, color }) => ({ position, scale: [radius, height, radius], color })),
    [],
  )

  return (
    <>
      <Instances items={flowerLeaves} material={{ roughness: 1, flatShading: true }}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>
      {/* Hoa hơi tự phát sáng để buổi tối vẫn thấy màu */}
      <Instances items={flowers} material={{ roughness: 0.8, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.06 }}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>

      <Instances items={trunkItems} material={{ color: '#6b4f3a', roughness: 1 }} castShadow>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
      </Instances>
      <Instances items={canopies} material={{ roughness: 1, flatShading: true }} castShadow>
        <icosahedronGeometry args={[1, 1]} />
      </Instances>
      <Instances items={pineItems} material={{ roughness: 1, flatShading: true }}>
        <coneGeometry args={[1, 1, 7]} />
      </Instances>

      <Instances items={hills} material={{ roughness: 1, flatShading: true }}>
        <icosahedronGeometry args={[1, 1]} />
      </Instances>
    </>
  )
}

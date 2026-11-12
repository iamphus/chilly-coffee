import Trees from '../trees/Trees.jsx'
import Instances from './Instances.jsx'
import { flowerLeaves, flowers, hills, treePlacements } from './layout.js'

// Chỉ cây sát quán mới đổ bóng (vùng bóng của mặt trời chỉ quanh quán; bóng cây xa vừa tốn vừa không thấy)
const NEAR_TREES = treePlacements.filter((tree) => tree.nearCafe)
const FAR_TREES = treePlacements.filter((tree) => !tree.nearCafe)

/** Hoa, cây (cây lá, cây hoa, thông; sinh bằng code) và đồi xa. */
export default function Garden() {
  return (
    <>
      <Instances items={flowerLeaves} material={{ roughness: 1, flatShading: true }}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>
      {/* Hoa hơi tự phát sáng để buổi tối vẫn thấy màu */}
      <Instances items={flowers} material={{ roughness: 0.8, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.06 }}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>

      <Trees placements={NEAR_TREES} castShadow />
      <Trees placements={FAR_TREES} castShadow={false} />

      <Instances items={hills} material={{ roughness: 1, flatShading: true }}>
        <icosahedronGeometry args={[1, 1]} />
      </Instances>
    </>
  )
}

import Fireflies from './Fireflies.jsx'
import Garden from './Garden.jsx'
import Ground from './Ground.jsx'
import ParkFixtures from './ParkFixtures.jsx'
import SkyDome from './SkyDome.jsx'
import WaterFeatures from './WaterFeatures.jsx'

/**
 * Khung cảnh bên ngoài quán: công viên có đài phun nước bên kia đường, vườn hồ sen bên kia hẻm,
 * hàng cây, đèn công viên, đồi xa, bầu trời (trăng sao buổi tối, mây ban ngày / nắng chiều).
 */
export default function Surroundings({ preset, atmosphereRef = null, lite = false }) {
  return (
    <>
      <SkyDome preset={preset} atmosphereRef={atmosphereRef} />
      <Ground />
      <Garden />
      <ParkFixtures preset={preset} atmosphereRef={atmosphereRef} />
      <WaterFeatures />
      {!lite && <Fireflies opacity={preset.fireflies} atmosphereRef={atmosphereRef} />}
    </>
  )
}

import Fireflies from './Fireflies.jsx'
import Garden from './Garden.jsx'
import Ground from './Ground.jsx'
import ParkFixtures from './ParkFixtures.jsx'
import SkyDome from './SkyDome.jsx'
import WaterFeatures from './WaterFeatures.jsx'

/**
 * Khung cảnh bên ngoài quán: công viên có đài phun nước bên kia đường, vườn hồ sen bên kia hẻm,
 * hàng cây, đèn công viên, đồi xa, bầu trời (trăng sao buổi tối, mây ban ngày).
 * Bố cục ở layout.js. Toàn bộ vẽ bằng instancing, không thêm đèn thật (trừ ánh trăng trong Lighting).
 * Người chơi chưa đi vào công viên được (nằm ngoài lưới đi lại nav.json), chỉ để ngắm.
 */
export default function Surroundings({ preset, lite = false }) {
  return (
    <>
      <SkyDome preset={preset} />
      <Ground />
      <Garden />
      <ParkFixtures preset={preset} />
      <WaterFeatures />
      {!lite && <Fireflies opacity={preset.fireflies} />}
    </>
  )
}

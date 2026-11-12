// Laptop đơn giản cho khách trong quán (kích thước giống laptop ở bản thử).
// Gốc toạ độ: giữa đáy máy; +z hướng về phía người ngồi.
const WIDTH = 0.34
const DEPTH = 0.245
const BASE_THICKNESS = 0.011
const LID_HEIGHT = 0.2305
const LID_THICKNESS = 0.006
const LID_TILT = -0.3 // nắp ngả ra sau
const SCREEN_INSET = 0.012

const ALUMINIUM = '#b9bdc3'
const SCREEN = '#d5e2f3' // màn hình sáng nhẹ, nổi bật trong quán buổi tối

export default function Laptop(props) {
  return (
    <group {...props}>
      <mesh position={[0, BASE_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, BASE_THICKNESS, DEPTH]} />
        <meshStandardMaterial color={ALUMINIUM} metalness={0.4} roughness={0.45} />
      </mesh>

      <group position={[0, BASE_THICKNESS, -DEPTH / 2 + 0.006]} rotation={[LID_TILT, 0, 0]}>
        <mesh position={[0, LID_HEIGHT / 2, -LID_THICKNESS / 2]} castShadow>
          <boxGeometry args={[WIDTH, LID_HEIGHT, LID_THICKNESS]} />
          <meshStandardMaterial color={ALUMINIUM} metalness={0.4} roughness={0.45} />
        </mesh>
        <mesh position={[0, LID_HEIGHT / 2, 0.0006]}>
          <planeGeometry args={[WIDTH - SCREEN_INSET * 2, LID_HEIGHT - SCREEN_INSET * 2]} />
          <meshBasicMaterial color={SCREEN} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

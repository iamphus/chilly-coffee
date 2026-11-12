// Sương ở xa để công viên, đồi và hàng cây hoà dần vào chân trời; trong quán (gần) không bị ảnh hưởng.
// Màu sương = màu chân trời của bầu trời (SkyDome), nên mép thế giới không lộ.
const NEAR = 24
const FAR = 78

export default function Fog({ color }) {
  return <fog attach="fog" args={[color, NEAR, FAR]} />
}

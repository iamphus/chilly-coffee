// Sương ở xa để công viên, đồi và hàng cây hoà dần vào chân trời; trong quán (gần) không bị ảnh hưởng.
// Màu sương = màu chân trời của bầu trời (SkyDome), nên mép thế giới không lộ. Trời mưa thì sương dày hơn.
const NEAR = 24
const FAR = 78

export default function Fog({ color, near = NEAR, far = FAR }) {
  return <fog attach="fog" args={[color, near, far]} />
}

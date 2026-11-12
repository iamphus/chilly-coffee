// Sương nhẹ ở xa để mép phố hoà vào nền trời; trong quán (gần) không bị ảnh hưởng.
const NEAR = 16
const FAR = 36

export default function Fog({ color }) {
  return <fog attach="fog" args={[color, NEAR, FAR]} />
}

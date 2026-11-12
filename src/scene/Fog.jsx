import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Lúc camera còn ở ngoài phố, sương làm mép phố hoà vào nền trời; bay lên toàn cảnh thì sương lùi ra xa.
// Chỉ đổi near/far chứ không bật tắt sương, để khỏi phải biên dịch lại shader giữa chừng.
const STREET = { near: 14, far: 30 }
const OVERVIEW = { near: 60, far: 120 }
const FADE_SPEED = 1.5

export default function Fog({ color }) {
  const fog = useRef(null)

  useFrame((_, delta) => {
    if (!fog.current) return
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * FADE_SPEED)
    fog.current.near += (OVERVIEW.near - fog.current.near) * k
    fog.current.far += (OVERVIEW.far - fog.current.far) * k
  })

  return <fog ref={fog} attach="fog" args={[color, STREET.near, STREET.far]} />
}

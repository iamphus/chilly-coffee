import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Sương ở xa để công viên, đồi và hàng cây hoà dần vào chân trời; luôn gắn cố định để không biên dịch lại shader.
const NEAR = 24
const FAR = 78

export default function Fog({ color, near = NEAR, far = FAR, atmosphereRef = null }) {
  const fogRef = useRef(null)
  const lastVersionRef = useRef(-1)

  useFrame(() => {
    const atmo = atmosphereRef?.current
    const fog = fogRef.current
    if (!atmo || !fog || lastVersionRef.current === atmo.version) return
    lastVersionRef.current = atmo.version
    fog.color.copy(atmo.colors.skyHorizon)
    fog.near = atmo.values.fogNear
    fog.far = atmo.values.fogFar
  })

  return <fog ref={fogRef} attach="fog" args={[color, near, far]} />
}

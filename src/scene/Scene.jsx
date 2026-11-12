import { OrbitControls } from '@react-three/drei'
import Cafe from './Cafe.jsx'
import Lighting from './Lighting.jsx'

const DAY_SKY = '#9fb4c6'
const ORBIT_TARGET = [0, 0, -4.5]

export default function Scene() {
  return (
    <>
      <color attach="background" args={[DAY_SKY]} />
      <Lighting />
      <Cafe />
      <OrbitControls
        makeDefault
        target={ORBIT_TARGET}
        enableDamping
        maxPolarAngle={1.5}
        minDistance={0.4}
        maxDistance={22}
      />
    </>
  )
}

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { VIEWS } from './cameraViews.js'

const FLY_SPEED = 2.2 // càng lớn bay càng nhanh
const ARRIVED_DISTANCE = 0.05
const OVERVIEW_TARGET = VIEWS.overview.target.toArray()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Vừa vào quán: camera bay từ ngoài phố lên toàn cảnh (nối tiếp video ở landing),
 * bay xong mới trả quyền xoay/phóng to cho người dùng.
 */
export default function CameraRig() {
  const flying = useRef(true)
  const target = useRef(VIEWS.street.target.clone())
  // Chỉ bật OrbitControls khi bay xong, nếu không nó sẽ giành quyền điều khiển camera giữa chừng
  const [free, setFree] = useState(false)

  useFrame(({ camera }, delta) => {
    if (!flying.current) return

    const k = prefersReducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * FLY_SPEED)
    camera.position.lerp(VIEWS.overview.position, k)
    target.current.lerp(VIEWS.overview.target, k)
    camera.lookAt(target.current)

    if (camera.position.distanceTo(VIEWS.overview.position) < ARRIVED_DISTANCE) {
      flying.current = false
      setFree(true)
    }
  })

  return (
    <OrbitControls
      makeDefault
      enabled={free}
      target={OVERVIEW_TARGET}
      enableDamping
      maxPolarAngle={1.5}
      minDistance={0.4}
      maxDistance={22}
    />
  )
}

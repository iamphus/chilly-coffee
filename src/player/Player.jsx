import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Box3, Raycaster, Vector2, Vector3 } from 'three'
import { CHARACTER_URLS, CLIPS } from '../characters/characterAssets.js'
import { useCafeStore } from '../store.js'
import { dampAngle } from './gameState.js'
import { findPath, isBlocked } from './nav.js'
import { readAxes, useKeyboard } from './useKeyboard.js'

const WALK_SPEED = 1.6 // m/s
const RUN_SPEED = 3.0 // giữ Shift
const BACK_SPEED = 0.7 // S ở chế độ khóa sau lưng: lùi chậm, vẫn nhìn về trước
const TURN_SPEED = 2.6 // rad/s khi giữ A/D ở chế độ khóa sau lưng
const FACE_TAU = 0.08 // giây để nhân vật xoay mặt theo hướng đi (tự đi / xoay tự do)
const WALK_ANIM_SPEED = 1.1 // hoạt ảnh Di_Bo khớp với tốc độ bao nhiêu m/s
const ARRIVE_DISTANCE = 0.08
const FLOOR_TAU = 0.06 // bám độ cao sàn mượt khi lên xuống bậc
const CLICK_MAX_MOVE = 6 // px: kéo chuột xa hơn thì là xoay camera, không phải bấm để đi
const CLICK_MAX_TIME = 600 // ms
const FADE = 0.2 // giây chuyển giữa đứng ↔ đi
const HIDE_WHEN_CAMERA_CLOSER = 0.6 // m: camera sát hơn thì ẩn nhân vật (khỏi một cái đầu to che màn hình)

/** Vòng tròn nhỏ ở điểm đến khi bấm lên sàn */
function DestinationMarker({ position }) {
  const ring = useRef(null)
  useFrame(({ clock }) => {
    if (!ring.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 6) * 0.08
    ring.current.scale.setScalar(pulse)
  })
  return (
    <mesh ref={ring} position={[position.x, position.y + 0.02, position.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <ringGeometry args={[0.16, 0.22, 40]} />
      <meshBasicMaterial color="#f6eee3" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Thử bước tới (x, z); vướng thì trượt dọc theo trục còn lại (đi men tường thay vì đứng khựng). */
function stepWithCollision(position, dx, dz) {
  const x = position.x + dx
  const z = position.z + dz
  if (!isBlocked(x, z)) return position.set(x, position.y, z)
  if (!isBlocked(x, position.z)) return position.setX(x)
  if (!isBlocked(position.x, z)) return position.setZ(z)
  return position
}

/**
 * Nhân vật người chơi.
 * - Khóa sau lưng: W/S đi tới/lùi theo hướng nhân vật, A/D xoay người.
 * - Xoay tự do: W A S D đi theo hướng camera, nhân vật tự quay mặt theo hướng đi.
 * - Bấm lên sàn: tự tìm đường tới đó; bấm phím di chuyển thì huỷ đường tự đi.
 * `gameRef` là ref chứa trạng thái dùng chung với camera (xem gameState.js).
 */
export default function Player({ gameRef, colliders }) {
  const characterId = useCafeStore((state) => state.characterId)
  const { scene, animations } = useGLTF(CHARACTER_URLS[characterId])
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)
  const group = useRef(null)
  const keys = useKeyboard()
  const path = useRef([])
  const [destination, setDestination] = useState(null)
  const animation = useRef(null) // { mixer, idle, walk, current }

  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((object) => {
      if (object.isMesh) object.castShadow = true
    })
    return copy
  }, [scene])

  // Đo chiều cao nhân vật để camera đặt khoảng cách theo tỉ lệ
  useEffect(() => {
    gameRef.current.height = new Box3().setFromObject(model).getSize(new Vector3()).y || 1
  }, [gameRef, model])

  useEffect(() => {
    const mixer = new AnimationMixer(model)
    const idle = mixer.clipAction(AnimationClip.findByName(animations, CLIPS.STAND))
    const walk = mixer.clipAction(AnimationClip.findByName(animations, CLIPS.WALK))
    idle.play()
    animation.current = { mixer, idle, walk, current: idle }
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
      animation.current = null
    }
  }, [model, animations])

  // Bấm lên sàn (không phải kéo) → tìm đường tới điểm đó
  useEffect(() => {
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    let down = null

    const onDown = (event) => {
      if (event.button === 0) down = { x: event.clientX, y: event.clientY, time: performance.now() }
    }
    const onUp = (event) => {
      if (event.button !== 0 || !down) return
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y)
      const quick = performance.now() - down.time < CLICK_MAX_TIME
      down = null
      if (moved > CLICK_MAX_MOVE || !quick) return

      const rect = domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const point = colliders.pickFloor(raycaster)
      if (!point) return
      const { position } = gameRef.current
      const route = findPath(position.x, position.z, point.x, point.z, 0.8)
      if (!route?.length) return
      path.current = route
      const [x, z] = route.at(-1)
      setDestination(new Vector3(x, point.y, z))
    }

    domElement.addEventListener('pointerdown', onDown)
    domElement.addEventListener('pointerup', onUp)
    return () => {
      domElement.removeEventListener('pointerdown', onDown)
      domElement.removeEventListener('pointerup', onUp)
    }
  }, [camera, colliders, domElement, gameRef])

  useFrame((_, frameDelta) => {
    const dt = Math.min(frameDelta, 0.05)
    const state = gameRef.current
    const { position } = state
    const mode = useCafeStore.getState().cameraMode
    const { forward, side, run } = readAxes(keys.current)
    const usingKeys = forward !== 0 || side !== 0

    // Bấm phím di chuyển thì huỷ đường tự đi
    if (usingKeys && path.current.length) {
      path.current = []
      setDestination(null)
    }

    let speed = 0 // m/s, âm = lùi
    let moveX = 0
    let moveZ = 0

    if (usingKeys && mode === 'locked') {
      state.yaw -= side * TURN_SPEED * dt // D = xoay phải
      if (forward > 0) speed = run ? RUN_SPEED : WALK_SPEED
      if (forward < 0) speed = -BACK_SPEED
      moveX = Math.sin(state.yaw)
      moveZ = Math.cos(state.yaw)
    } else if (usingKeys) {
      // Xoay tự do: đi theo hướng camera đang nhìn
      const cameraYaw = state.cameraYaw
      const aheadX = -Math.sin(cameraYaw)
      const aheadZ = -Math.cos(cameraYaw)
      const rightX = Math.cos(cameraYaw)
      const rightZ = -Math.sin(cameraYaw)
      const x = aheadX * forward + rightX * side
      const z = aheadZ * forward + rightZ * side
      const length = Math.hypot(x, z)
      moveX = x / length
      moveZ = z / length
      speed = run ? RUN_SPEED : WALK_SPEED
      state.yaw = dampAngle(state.yaw, Math.atan2(moveX, moveZ), FACE_TAU, dt)
    } else if (path.current.length) {
      const [tx, tz] = path.current[0]
      const dx = tx - position.x
      const dz = tz - position.z
      const distance = Math.hypot(dx, dz)
      if (distance < ARRIVE_DISTANCE) {
        path.current.shift()
        if (!path.current.length) setDestination(null)
      } else {
        moveX = dx / distance
        moveZ = dz / distance
        speed = Math.min(run ? RUN_SPEED : WALK_SPEED, distance / dt)
        state.yaw = dampAngle(state.yaw, Math.atan2(moveX, moveZ), FACE_TAU, dt)
      }
    }

    if (speed !== 0) stepWithCollision(position, moveX * speed * dt, moveZ * speed * dt)

    // Bám độ cao sàn (bậc thềm, bậc thang)
    const floor = colliders.floorHeight(position.x, position.z, position.y)
    if (floor !== null) position.y = floor + (position.y - floor) * Math.exp(-dt / FLOOR_TAU)

    state.moving = speed !== 0

    // Hoạt ảnh: đứng ↔ đi; tốc độ bước chân theo tốc độ đi, lùi thì chạy ngược
    const anim = animation.current
    if (anim) {
      const next = state.moving ? anim.walk : anim.idle
      if (next !== anim.current) {
        next.reset().fadeIn(FADE).play()
        anim.current.fadeOut(FADE)
        anim.current = next
      }
      if (state.moving) anim.walk.timeScale = speed / WALK_ANIM_SPEED
      anim.mixer.update(dt)
    }

    if (group.current) {
      group.current.position.copy(position)
      group.current.rotation.y = state.yaw
      group.current.visible = state.cameraDistance > HIDE_WHEN_CAMERA_CLOSER
    }
  }, -1) // chạy trước camera trong cùng khung hình

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
      </group>
      {destination && <DestinationMarker position={destination} />}
    </>
  )
}

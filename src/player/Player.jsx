import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Box3, LoopRepeat, Raycaster, Vector2, Vector3 } from 'three'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import { CHARACTER_URLS, CLIPS } from '../characters/characterAssets.js'
import { occupiedSeats } from '../scene/guestList.js'
import Laptop from '../scene/Laptop.jsx'
import { SEAT_NAMES, laptopPoses, seatPose, seatYaw } from '../scene/seating.js'
import { useCafeStore } from '../store.js'
import { createActionClips } from './actionClips.js'
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
const FADE = 0.2 // giây chuyển giữa các hoạt ảnh
const HIDE_WHEN_CAMERA_CLOSER = 0.6 // m: camera sát hơn thì ẩn nhân vật (khỏi một cái đầu to che màn hình)
const SEAT_REACH = 1.2 // m: đứng gần ghế trống hơn thế này thì hiện nút "Ngồi xuống"
const SEAT_CLICK_RADIUS = 0.65 // m: bấm vào ghế/bàn trong bán kính này thì đi tới ngồi
const SIT_DURATION = 0.45 // giây lướt vào ghế
// Phạm vi trong quán (gồm phòng chính, phòng sau, sân vườn, phòng lớn) để đổi âm thanh trong / ngoài
const CAFE_BOUNDS = { xMin: -3.95, xMax: 3.75, zMin: -13.3, zMax: 3.15 }
const isInside = ({ x, z }) => x > CAFE_BOUNDS.xMin && x < CAFE_BOUNDS.xMax && z > CAFE_BOUNDS.zMin && z < CAFE_BOUNDS.zMax

const smoothstep = (t) => t * t * (3 - 2 * t)

/** Góc nhìn thứ nhất khi ngồi: từ đầu người ngồi nhìn vào màn hình laptop. */
function firstPersonView(seat, laptop) {
  const yaw = seatYaw(seat)
  const forwardX = Math.sin(yaw)
  const forwardZ = Math.cos(yaw)
  const [lx, ly, lz] = laptop.position
  const [hx, , hz] = seatPose(seat).position
  return {
    eye: new Vector3(hx - forwardX * 0.1, ly + 0.42, hz - forwardZ * 0.1),
    target: new Vector3(lx + forwardX * 0.1, ly + 0.11, lz + forwardZ * 0.1), // giữa màn hình (nắp ngả ra sau)
  }
}

/** Vòng tròn nhỏ ở điểm đến khi bấm lên sàn */
function DestinationMarker({ position }) {
  const ring = useRef(null)
  useFrame(({ clock }) => {
    if (!ring.current) return
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.08)
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
 * - Bấm lên sàn: tự tìm đường tới đó; bấm vào ghế/bàn trống: đi tới rồi ngồi.
 * - Ngồi (store.seat): lướt vào ghế, nhâm nhi cà phê, laptop gập; mở laptop (store.laptopOpen) thì gõ phím
 *   và camera chuyển sang góc nhìn thứ nhất vào màn hình (gameRef.seatView).
 * `gameRef` là ref chứa trạng thái dùng chung với camera (xem gameState.js).
 */
export default function Player({ gameRef, colliders }) {
  const characterId = useCafeStore((state) => state.characterId)
  const seat = useCafeStore((state) => state.seat)
  const laptopOpen = useCafeStore((state) => state.laptopOpen)
  const { scene, animations } = useGLTF(CHARACTER_URLS[characterId])
  const { scene: cafe } = useGLTF(cafeUrl)
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)
  const group = useRef(null)
  const keys = useKeyboard()
  const path = useRef([])
  const pendingSeat = useRef(null) // bấm vào ghế: đi tới nơi thì ngồi
  const sitting = useRef(null) // { from, fromYaw, to, toYaw, t } khi đang lướt vào ghế
  const approach = useRef(null) // chỗ đứng trước khi ngồi, để đứng dậy quay về
  const [destination, setDestination] = useState(null)
  const animation = useRef(null) // { mixer, clips: { idle, walk, type, wave, … }, current }

  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((object) => {
      if (object.isMesh) object.castShadow = true
    })
    return copy
  }, [scene])
  const height = useMemo(() => new Box3().setFromObject(model).getSize(new Vector3()).y || 1, [model])

  // Bàn trống = mọi bàn trừ bàn có khách (khách trùng nhân vật người chơi đã bị bỏ nên bàn đó trống)
  const freeSeats = useMemo(() => {
    const taken = occupiedSeats([characterId])
    return SEAT_NAMES.filter((name) => !taken.has(name)).map((name) => {
      const { position } = seatPose(name)
      return { name, x: position[0], z: position[2] }
    })
  }, [characterId])
  const laptop = useMemo(() => (seat ? laptopPoses(cafe, [seat])[0] : null), [cafe, seat])

  useEffect(() => {
    gameRef.current.height = height
  }, [gameRef, height])

  useEffect(() => {
    const mixer = new AnimationMixer(model)
    const extra = createActionClips(characterId, animations)
    const clips = {
      idle: AnimationClip.findByName(animations, CLIPS.STAND),
      walk: AnimationClip.findByName(animations, CLIPS.WALK),
      type: AnimationClip.findByName(animations, CLIPS.TYPE),
      seatedDrink: AnimationClip.findByName(animations, CLIPS.DRINK), // ngồi nhâm nhi khi laptop gập
      ...extra,
    }
    const actions = Object.fromEntries(
      Object.entries(clips).map(([key, clip]) => [key, mixer.clipAction(clip).setLoop(LoopRepeat, Infinity)]),
    )
    actions.idle.play()
    animation.current = { mixer, actions, current: actions.idle }
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
      animation.current = null
    }
  }, [model, animations, characterId])

  // Ngồi xuống / đứng dậy theo store.seat
  useEffect(() => {
    const state = gameRef.current
    if (seat) {
      const pose = seatPose(seat)
      approach.current = state.position.clone()
      sitting.current = {
        from: state.position.clone(),
        fromYaw: state.yaw,
        to: new Vector3(...pose.position),
        toYaw: pose.rotation[1],
        t: 0,
      }
      path.current = []
      pendingSeat.current = null
      return () => {
        // Đứng dậy: về chỗ đứng lúc trước, quay lưng lại bàn
        sitting.current = null
        if (approach.current) state.position.copy(approach.current)
        state.yaw = seatYaw(seat) + Math.PI
      }
    }
  }, [cafe, gameRef, seat])

  // Mở laptop: camera vào màn hình; gập lại: camera về góc nhìn thứ ba quanh chỗ ngồi
  useEffect(() => {
    const state = gameRef.current
    state.seatView = seat && laptopOpen ? firstPersonView(seat, laptopPoses(cafe, [seat])[0]) : null
    return () => {
      state.seatView = null
    }
  }, [cafe, gameRef, seat, laptopOpen])

  // Bấm lên sàn (không phải kéo) → tìm đường tới đó; bấm vào ghế/bàn trống → tới đó rồi ngồi
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
      const store = useCafeStore.getState()
      if (moved > CLICK_MAX_MOVE || !quick || store.seat || store.changingCharacter) return

      const rect = domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const point = colliders.pickFloor(raycaster)
      if (!point) return

      const { position } = gameRef.current
      const clickedSeat = freeSeats
        .map((free) => ({ ...free, distance: Math.hypot(free.x - point.x, free.z - point.z) }))
        .filter((free) => free.distance < SEAT_CLICK_RADIUS)
        .sort((a, b) => a.distance - b.distance)[0]
      pendingSeat.current = clickedSeat ?? null
      const [tx, tz] = clickedSeat ? [clickedSeat.x, clickedSeat.z] : [point.x, point.z]
      const route = findPath(position.x, position.z, tx, tz, 0.8)
      if (!route?.length) {
        path.current = []
        setDestination(null)
        return
      }
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
  }, [camera, colliders, domElement, freeSeats, gameRef])

  useFrame((_, frameDelta) => {
    const dt = Math.min(frameDelta, 0.05)
    const state = gameRef.current
    const { position } = state
    const store = useCafeStore.getState()
    let speed = 0 // m/s, âm = lùi

    if (store.seat) {
      // Đang ngồi: lướt vào ghế rồi ngồi yên
      const slide = sitting.current
      if (slide && slide.t < 1) {
        slide.t = Math.min(1, slide.t + dt / SIT_DURATION)
        const k = smoothstep(slide.t)
        position.lerpVectors(slide.from, slide.to, k)
        state.yaw = slide.fromYaw + Math.atan2(Math.sin(slide.toYaw - slide.fromYaw), Math.cos(slide.toYaw - slide.fromYaw)) * k
      }
    } else {
      const mode = store.cameraMode
      const blocked = store.changingCharacter
      const { forward, side, run } = blocked ? { forward: 0, side: 0, run: false } : readAxes(keys.current)
      const usingKeys = forward !== 0 || side !== 0
      let moveX = 0
      let moveZ = 0

      // Bấm phím di chuyển thì huỷ đường tự đi
      if (usingKeys && path.current.length) {
        path.current = []
        pendingSeat.current = null
        setDestination(null)
      }

      if (usingKeys && mode === 'locked') {
        state.yaw -= side * TURN_SPEED * dt // D = xoay phải
        if (forward > 0) speed = run ? RUN_SPEED : WALK_SPEED
        if (forward < 0) speed = -BACK_SPEED
        moveX = Math.sin(state.yaw)
        moveZ = Math.cos(state.yaw)
      } else if (usingKeys) {
        // Xoay tự do: đi theo hướng camera đang nhìn
        const cameraYaw = state.cameraYaw
        const x = -Math.sin(cameraYaw) * forward + Math.cos(cameraYaw) * side
        const z = -Math.cos(cameraYaw) * forward - Math.sin(cameraYaw) * side
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

      // Ghế trống gần nhất (để hiện nút "Ngồi xuống"); đi tới ghế đã bấm thì ngồi luôn
      let nearest = null
      let nearestDistance = SEAT_REACH
      for (const free of freeSeats) {
        const distance = Math.hypot(free.x - position.x, free.z - position.z)
        if (distance < nearestDistance) {
          nearest = free.name
          nearestDistance = distance
        }
      }
      if (nearest !== store.nearbySeat) useCafeStore.setState({ nearbySeat: nearest })
      if (pendingSeat.current && !path.current.length) {
        const target = pendingSeat.current
        pendingSeat.current = null
        if (Math.hypot(target.x - position.x, target.z - position.z) < SEAT_REACH + 0.2) store.sitDown(target.name)
      }

      // Đi thì thôi hành động đang làm (vẫy tay, vươn vai…)
      if (speed !== 0 && store.action) useCafeStore.setState({ action: null })
    }

    state.moving = speed !== 0
    const inside = Boolean(store.seat) || isInside(position)
    if (inside !== store.inside) useCafeStore.setState({ inside })

    // Hoạt ảnh: ngồi gõ phím / đi / hành động / đứng
    const anim = animation.current
    if (anim) {
      const key = store.seat ? (store.laptopOpen ? 'type' : 'seatedDrink') : state.moving ? 'walk' : (store.action ?? 'idle')
      const next = anim.actions[key]
      if (next !== anim.current) {
        next.reset().fadeIn(FADE).play()
        anim.current.fadeOut(FADE)
        anim.current = next
      }
      if (key === 'walk') next.timeScale = speed / WALK_ANIM_SPEED
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
      {laptop && <Laptop position={laptop.position} rotation={laptop.rotation} open={laptopOpen} />}
      {destination && <DestinationMarker position={destination} />}
    </>
  )
}

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useCafeStore } from '../store.js'
import { SPAWN, damp, dampAngle } from './gameState.js'
import { nameTagAnchor } from './nameTagAnchor.js'

// Khoảng cách tính theo chiều cao nhân vật (gameRef.current.height)
const DISTANCE = { default: 3.3, min: 1.5, max: 7 }
const LOOK_HEIGHT = 1.05 // nhìn vào điểm cao hơn đầu một chút → nhân vật nằm hơi thấp giữa màn hình
const PITCH = { default: 0.21, min: -0.15, max: 1.15 } // rad; 0,21 ≈ 12° chúc xuống
const FOLLOW_TAU = 0.1 // giây: camera đuổi theo vị trí nhân vật
const YAW_TAU = 0.12 // giây: camera xoay theo hướng nhân vật (khóa sau lưng)
const RETURN_TAU = 0.15 // giây: tự về sau lưng sau khi nhìn quanh / khi đổi sang khóa sau lưng (~0,5 s)
const ZOOM_OUT_TAU = 0.35 // hết vướng tường thì lùi về khoảng cách cũ từ từ
const MAX_LIFT = 0.75 // rad: bị tường ép sát thì nâng camera lên tối đa bấy nhiêu (nhìn qua đầu nhân vật)
const MAX_PITCH_WITH_LIFT = 1.35
const LIFT_TAU = 0.2
const NAME_TAG_ABOVE_HEAD = 0.12 // m
const NAME_TAG_MIN_CAMERA_DISTANCE = 1 // m: camera sát hơn thì ẩn bảng tên
const SEAT_TAU = 0.18 // giây: camera lướt vào / ra góc nhìn thứ nhất khi ngồi xuống / đứng dậy
const WALL_PADDING = 0.2 // m, giữ camera cách tường
const MIN_CAMERA_DISTANCE = 0.35
const MIN_HEIGHT_ABOVE_FEET = 0.25
const BODY_HEIGHT = 0.5 // tia thứ hai từ giữa thân người: thân cây, cột che người dù không che đầu
const DRAG_THRESHOLD = 3 // px
const YAW_PER_PIXEL = 0.006
const PITCH_PER_PIXEL = 0.004
const ZOOM_PER_WHEEL = 0.0012

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Camera góc nhìn thứ ba.
 * - Khóa sau lưng (mặc định): luôn ở sau lưng nhân vật; kéo chuột để nhìn quanh tạm thời,
 *   thả chuột ra và đi tiếp thì tự về sau lưng.
 * - Xoay tự do: giữ nguyên góc người dùng xoay, chỉ đi theo vị trí nhân vật.
 * Lăn chuột để phóng to/thu nhỏ; camera không xuyên tường (tia từ đầu nhân vật tới camera).
 */
export default function ThirdPersonCamera({ gameRef, colliders }) {
  const domElement = useThree((state) => state.gl.domElement)
  const rig = useRef(null)

  if (rig.current === null) {
    rig.current = {
      yaw: SPAWN.yaw + Math.PI, // hướng đặt camera so với nhân vật; sau lưng = hướng mặt + π
      lookYaw: 0, // nhìn quanh tạm thời (khóa sau lưng)
      pitch: PITCH.default,
      zoom: DISTANCE.default, // khoảng cách người dùng chọn (× chiều cao nhân vật)
      distance: DISTANCE.default, // khoảng cách thật sau khi tránh tường (m)
      target: new Vector3(...SPAWN.position),
      lift: 0, // nâng thêm góc nhìn khi bị tường ép gần
      pressed: false,
      returning: false,
    }
  }

  // Đổi chế độ: gộp phần "nhìn quanh" vào góc camera để không bị nhảy; sang khóa sau lưng thì lướt về
  useEffect(
    () =>
      useCafeStore.subscribe((state, previous) => {
        if (state.cameraMode === previous.cameraMode) return
        const r = rig.current
        r.yaw += r.lookYaw
        r.lookYaw = 0
        r.returning = state.cameraMode === 'locked'
      }),
    [],
  )

  // Kéo chuột trái/phải để xoay, lăn chuột để zoom
  useEffect(() => {
    let last = null
    let dragging = false

    const onDown = (event) => {
      if (event.button !== 0 && event.button !== 2) return
      last = { x: event.clientX, y: event.clientY }
      dragging = false
      rig.current.pressed = true
      domElement.setPointerCapture(event.pointerId)
    }
    const onMove = (event) => {
      if (!last) return
      const dx = event.clientX - last.x
      const dy = event.clientY - last.y
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      dragging = true
      domElement.style.cursor = 'grabbing'
      last = { x: event.clientX, y: event.clientY }
      const r = rig.current
      const free = useCafeStore.getState().cameraMode === 'free'
      if (free) r.yaw -= dx * YAW_PER_PIXEL
      else r.lookYaw -= dx * YAW_PER_PIXEL
      r.pitch = clamp(r.pitch + dy * PITCH_PER_PIXEL, PITCH.min, PITCH.max)
    }
    const onUp = (event) => {
      last = null
      dragging = false
      rig.current.pressed = false
      domElement.style.cursor = ''
      if (domElement.hasPointerCapture(event.pointerId)) domElement.releasePointerCapture(event.pointerId)
    }
    const onWheel = (event) => {
      event.preventDefault()
      const r = rig.current
      r.zoom = clamp(r.zoom * Math.exp(event.deltaY * ZOOM_PER_WHEEL), DISTANCE.min, DISTANCE.max)
    }
    const onContextMenu = (event) => event.preventDefault()

    domElement.addEventListener('pointerdown', onDown)
    domElement.addEventListener('pointermove', onMove)
    domElement.addEventListener('pointerup', onUp)
    domElement.addEventListener('pointercancel', onUp)
    domElement.addEventListener('wheel', onWheel, { passive: false })
    domElement.addEventListener('contextmenu', onContextMenu)
    return () => {
      domElement.removeEventListener('pointerdown', onDown)
      domElement.removeEventListener('pointermove', onMove)
      domElement.removeEventListener('pointerup', onUp)
      domElement.removeEventListener('pointercancel', onUp)
      domElement.removeEventListener('wheel', onWheel)
      domElement.removeEventListener('contextmenu', onContextMenu)
    }
  }, [domElement])

  const scratch = useRef({
    desired: new Vector3(),
    direction: new Vector3(),
    body: new Vector3(),
    toCamera: new Vector3(),
    cameraGoal: new Vector3(),
    tag: new Vector3(),
  })

  /** Bảng tên: chiếu đỉnh đầu ra toạ độ màn hình, sau khi camera đã cập nhật trong khung hình này. */
  const placeNameTag = (camera, size, state) => {
    const point = scratch.current.tag.copy(state.position)
    point.y += state.height + NAME_TAG_ABOVE_HEAD
    point.project(camera)
    nameTagAnchor.x = ((point.x + 1) / 2) * size.width
    nameTagAnchor.y = ((1 - point.y) / 2) * size.height
    nameTagAnchor.visible = !state.seatView && point.z < 1 && state.cameraDistance > NAME_TAG_MIN_CAMERA_DISTANCE
  }

  // Chạy sau Player (Player dùng priority −1) để dùng vị trí nhân vật của khung hình này.
  // Không dùng priority dương: R3F sẽ coi như mình tự vẽ và ngừng vẽ cảnh.
  useFrame(({ camera, size }, frameDelta) => {
    const dt = Math.min(frameDelta, 0.05)
    const r = rig.current
    const state = gameRef.current
    const locked = useCafeStore.getState().cameraMode === 'locked'

    // Đang ngồi: lướt vào góc nhìn thứ nhất, từ mắt nhìn xuống màn hình laptop
    if (state.seatView) {
      const k = 1 - Math.exp(-dt / SEAT_TAU)
      camera.position.lerp(state.seatView.eye, k)
      r.target.lerp(state.seatView.target, k)
      camera.lookAt(r.target)
      state.cameraDistance = camera.position.distanceTo(state.seatView.eye) // gần mắt thì Player ẩn nhân vật
      r.leavingSeat = true
      r.lookYaw = 0
      r.pitch = PITCH.default
      r.yaw = state.yaw + Math.PI
      placeNameTag(camera, size, state)
      return
    }

    if (locked) {
      r.yaw = dampAngle(r.yaw, state.yaw + Math.PI, r.returning ? RETURN_TAU : YAW_TAU, dt)
      if (r.returning && Math.abs(Math.sin((r.yaw - state.yaw - Math.PI) / 2)) < 0.01) r.returning = false
      // Thả chuột ra và đi tiếp: thôi nhìn quanh, camera về sau lưng
      if (!r.pressed && state.moving) {
        r.lookYaw = damp(r.lookYaw, 0, RETURN_TAU, dt)
        r.pitch = damp(r.pitch, PITCH.default, RETURN_TAU, dt)
      }
    }
    const yaw = r.yaw + r.lookYaw
    state.cameraYaw = yaw

    // Điểm nhìn: trên đầu nhân vật, đuổi theo mượt
    const { desired, direction, body, toCamera, cameraGoal } = scratch.current
    desired.copy(state.position)
    desired.y += state.height * LOOK_HEIGHT
    const follow = 1 - Math.exp(-dt / FOLLOW_TAU)
    r.target.lerp(desired, follow)

    // Hướng từ điểm nhìn ra camera
    const aim = (pitch) =>
      direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
    const wanted = r.zoom * state.height

    // Bị tường ép gần (hẻm hẹp, phòng nhỏ): nâng camera lên, nhìn chúc xuống nhiều hơn để vẫn thấy qua đầu
    aim(r.pitch)
    const roomAtEyeLevel = Math.min(wanted, colliders.obstacleDistance(r.target, direction, wanted + WALL_PADDING) - WALL_PADDING)
    const squeeze = 1 - clamp(roomAtEyeLevel / wanted, 0, 1)
    r.lift = damp(r.lift, squeeze * MAX_LIFT, LIFT_TAU, dt)
    aim(Math.min(r.pitch + r.lift, MAX_PITCH_WITH_LIFT))

    // Tránh tường: vướng thì kéo lại gần ngay, hết vướng thì lùi ra từ từ
    const obstacle = colliders.obstacleDistance(r.target, direction, wanted + WALL_PADDING)
    let allowed = Math.max(MIN_CAMERA_DISTANCE, Math.min(wanted, obstacle - WALL_PADDING))

    // Thân người cũng phải thấy được: vật chắn giữa thân và camera thì kéo camera vào trước vật đó
    body.copy(state.position)
    body.y += state.height * BODY_HEIGHT
    toCamera.copy(r.target).addScaledVector(direction, allowed).sub(body)
    const toCameraLength = toCamera.length()
    const bodyHit = colliders.obstacleDistance(body, toCamera.normalize(), toCameraLength)
    if (bodyHit < toCameraLength) {
      allowed = Math.max(MIN_CAMERA_DISTANCE, allowed * (bodyHit / toCameraLength) - WALL_PADDING)
    }
    r.distance = allowed < r.distance ? allowed : damp(r.distance, allowed, ZOOM_OUT_TAU, dt)

    state.cameraDistance = r.distance
    cameraGoal.copy(r.target).addScaledVector(direction, r.distance)
    cameraGoal.y = Math.max(cameraGoal.y, state.position.y + MIN_HEIGHT_ABOVE_FEET)
    if (r.leavingSeat) {
      // Vừa đứng dậy: lướt từ góc nhìn thứ nhất ra sau lưng, không nhảy cái rụp
      camera.position.lerp(cameraGoal, 1 - Math.exp(-dt / SEAT_TAU))
      if (camera.position.distanceTo(cameraGoal) < 0.05) r.leavingSeat = false
    } else {
      camera.position.copy(cameraGoal)
    }
    camera.lookAt(r.target)
    camera.updateMatrixWorld()
    placeNameTag(camera, size, state)
  })

  return null
}

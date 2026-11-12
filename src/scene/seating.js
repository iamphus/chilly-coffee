// Cách đặt nhân vật ngồi vào bàn và đặt laptop trước mặt (giống bản thử).
// Dùng chung cho khách trong app (Guests.jsx) và nhân vật chính trong video landing.
import { Raycaster, Vector3 } from 'three'
import cafeMeta from '../../assets/cafe/cafe.meta.json'

const SEAT_HEIGHT = 0.46
const HIP_OFFSET = 0.47 * 0.65 - 0.02 // từ chân nhân vật tới mông, đã nhân tỉ lệ nhân vật
const LEAN_FORWARD = 0.06
const LAPTOP_DISTANCE = 0.42 // từ đầu người ngồi tới giữa laptop
const DEFAULT_TABLE_HEIGHT = 0.74

export const SEATS = Object.fromEntries(cafeMeta.seats.map((seat) => [seat.n, seat]))

/** Hướng mặt người ngồi ở bàn `seat` (radian quanh trục y). */
export function seatYaw(seat) {
  const { c: head, l: look } = SEATS[seat]
  return Math.atan2(look[0] - head[0], look[2] - head[2])
}

/** Vị trí và hướng của nhân vật ngồi ở bàn `seat`; seatLift: ghế cao/thấp hơn ghế thường (mét). */
export function seatPose(seat, seatLift = 0) {
  const head = SEATS[seat].c
  const yaw = seatYaw(seat)
  return {
    position: [
      head[0] + Math.sin(yaw) * LEAN_FORWARD,
      SEAT_HEIGHT + seatLift - HIP_OFFSET,
      head[2] + Math.cos(yaw) * LEAN_FORWARD,
    ],
    rotation: [0, yaw, 0],
  }
}

/** Độ cao mặt bàn tại (x, z): bắn tia từ trên xuống, lấy mặt nằm ngang đầu tiên. */
function tableHeight(cafe, raycaster, x, z) {
  raycaster.set(new Vector3(x, 1.45, z), new Vector3(0, -1, 0))
  for (const hit of raycaster.intersectObject(cafe, true)) {
    if (!hit.face) continue
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    if (Math.abs(normal.y) > 0.85 && hit.point.y > 0.3 && hit.point.y < 1.15) return hit.point.y
  }
  return DEFAULT_TABLE_HEIGHT
}

/** Vị trí laptop trên bàn trước mặt người ngồi ở các bàn `seats`, màn hình quay về phía người. */
export function laptopPoses(cafe, seats) {
  cafe.updateMatrixWorld(true)
  const raycaster = new Raycaster()
  return seats.map((seat) => {
    const head = SEATS[seat].c
    const yaw = seatYaw(seat)
    const x = head[0] + Math.sin(yaw) * LAPTOP_DISTANCE
    const z = head[2] + Math.cos(yaw) * LAPTOP_DISTANCE
    return {
      seat,
      position: [x, tableHeight(cafe, raycaster, x, z), z],
      rotation: [0, yaw + Math.PI, 0],
    }
  })
}

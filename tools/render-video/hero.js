// Nhân vật chính của video: đi dọc hẻm, rẽ vào cửa chính, vào tới giữa quán thì dừng lại vẫy tay.
// Vị trí là hàm của thời gian (không cộng dồn) để camera bám theo được ở bất kỳ khung hình nào.
import { CLIPS } from '../../src/characters/characterAssets.js'

export const HERO_ID = 'guest_headphones' // đeo tai nghe: đúng tinh thần "tập trung" của quán
export const HERO_SEAT = 'Ban_10' // bàn lưới đen, quay lưng ra cửa kính trước: phía sau là phố đêm
const SPEED = 1.1 // mét/giây
const WALK_TIME_SCALE = 1.1 // bước chân khớp với tốc độ đi
const TURN_RADIUS = 0.35 // khoảng cách quanh góc rẽ để xoay người từ từ

// [x, z] theo toạ độ quán; lối từ hẻm vào cửa chính (x ≈ −4.2, z ≈ −0.5) đã kiểm tra trên nav.json
const PATH = [
  [-6.4, 3.6],
  [-6.4, -0.2],
  [-6.0, -0.5],
  [-2.9, -0.5],
]

const SEGMENTS = PATH.slice(1).map(([x, z], i) => {
  const [px, pz] = PATH[i]
  return { from: [px, pz], dx: x - px, dz: z - pz, length: Math.hypot(x - px, z - pz), yaw: Math.atan2(x - px, z - pz) }
})
const TOTAL = SEGMENTS.reduce((sum, segment) => sum + segment.length, 0)

function mixAngle(a, b, t) {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + delta * t
}

/** Trạng thái nhân vật chính sau `elapsed` giây kể từ lúc bắt đầu đi. */
export function heroAt(elapsed) {
  let distance = Math.min(Math.max(elapsed, 0) * SPEED, TOTAL)
  const walking = distance < TOTAL

  let index = 0
  while (index < SEGMENTS.length - 1 && distance > SEGMENTS[index].length) {
    distance -= SEGMENTS[index].length
    index++
  }
  const segment = SEGMENTS[index]
  const t = Math.min(distance / segment.length, 1)

  // Xoay người mượt khi gần góc rẽ: nửa trước góc và nửa sau góc
  let yaw = segment.yaw
  if (index > 0 && distance < TURN_RADIUS) {
    yaw = mixAngle(SEGMENTS[index - 1].yaw, segment.yaw, 0.5 + 0.5 * (distance / TURN_RADIUS))
  } else if (index < SEGMENTS.length - 1 && segment.length - distance < TURN_RADIUS) {
    yaw = mixAngle(segment.yaw, SEGMENTS[index + 1].yaw, 0.5 * (1 - (segment.length - distance) / TURN_RADIUS))
  }

  return {
    position: [segment.from[0] + segment.dx * t, 0, segment.from[1] + segment.dz * t],
    yaw,
    clip: walking ? CLIPS.WALK : CLIPS.WAVE,
    timeScale: walking ? WALK_TIME_SCALE : 1,
  }
}

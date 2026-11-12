// Kịch bản video nền landing, dựng theo kiểu TVC:
//   mở bằng góc máy ngang tầm mắt bám theo nhân vật chính đi vào quán (cắt cảnh liền mạch),
//   rồi cảnh nhân vật ngồi làm việc, các cảnh không khí trong quán, cuối cùng bay lên toàn cảnh.
//
// Mỗi cảnh quay: camera đi từ `from` tới `to` (toạ độ mét, giống cafe.meta.json).
//   follow: 'both'   → cả vị trí lẫn điểm nhìn tính tương đối so với nhân vật chính (camera bám theo)
//   follow: 'target' → camera đứng yên/trượt theo toạ độ thật, chỉ xoay theo nhân vật
//   hero: 'walk' (nhân vật chính đang đi) | 'seated' (đang ngồi làm việc ở HERO_SEAT)
//   transition: cách nối từ cảnh trước sang cảnh này: 'cut' (cắt thẳng) | 'fade' (mờ dần)
// Cảnh cuối luôn mờ dần sang đầu cảnh 1 để video lặp liền mạch.
import { SEATS, seatYaw } from '../../src/scene/seating.js'
import { HERO_SEAT } from './hero.js'

export const FPS = 30
export const WIDTH = 2560 // video xuất ra 2K (2560×1440)
export const HEIGHT = 1440
export const SUPERSAMPLE = 1.5 // render ở 3840×2160 rồi thu nhỏ để cạnh mịn, không răng cưa
export const CROSSFADE = 0.8 // giây
export const WARM_UP = 2 // giây chạy trước khi quay để hoạt ảnh và bóng đổ ổn định

const STREET_FOG = [14, 30]
const NO_FOG = [60, 120]

// Góc máy ngồi đối diện nhân vật chính, nhìn qua bàn
const seat = SEATS[HERO_SEAT]
const yaw = seatYaw(HERO_SEAT)
const facing = [Math.sin(yaw), Math.cos(yaw)] // hướng nhân vật nhìn
const side = [facing[1], -facing[0]]
const acrossTable = (distance, sideOffset, height) => [
  seat.c[0] + facing[0] * distance + side[0] * sideOffset,
  height,
  seat.c[2] + facing[1] * distance + side[1] * sideOffset,
]
const heroFace = [seat.c[0] + facing[0] * 0.15, 0.78, seat.c[2] + facing[1] * 0.15]

export const SHOTS = [
  {
    name: 'den-quan', // ngang tầm mắt, bám sau lưng nhân vật đi dọc hẻm tới cửa quán
    duration: 4,
    fov: 42,
    ceiling: true,
    fog: STREET_FOG,
    hero: 'walk',
    follow: 'both',
    from: { position: [-0.7, 0.9, 2.6], target: [0.4, 0.65, -1.4] },
    to: { position: [-1.5, 0.95, 1.3], target: [0.9, 0.6, -0.4] },
  },
  {
    name: 'buoc-vao', // trong quán nhìn ra cửa: nhân vật bước vào, dừng lại vẫy tay
    duration: 4.5,
    fov: 40,
    ceiling: true,
    fog: NO_FOG,
    hero: 'walk',
    follow: 'target',
    transition: 'cut',
    from: { position: [-1.7, 0.95, -0.2], target: [0, 0.62, 0] },
    to: { position: [-1.3, 0.92, -0.05], target: [0, 0.6, 0] },
  },
  {
    name: 'ngoi-lam-viec', // đối diện qua bàn: nhân vật đeo tai nghe gõ laptop, sau lưng là phố đêm
    duration: 4.5,
    fov: 38,
    ceiling: true,
    fog: NO_FOG,
    hero: 'seated',
    transition: 'fade',
    from: { position: acrossTable(1.9, 0.45, 1.02), target: heroFace },
    to: { position: acrossTable(1.5, 0.3, 0.98), target: heroFace },
  },
  {
    name: 'ben-trong', // trong quán nhìn ra cửa kính, đèn vàng
    duration: 4,
    fov: 45,
    ceiling: true,
    fog: NO_FOG,
    hero: 'seated',
    transition: 'fade',
    from: { position: [3.0, 1.55, -2.3], target: [-1.5, 1.2, 2.8] },
    to: { position: [2.3, 1.45, -1.1], target: [-1.2, 1.1, 2.8] },
  },
  {
    name: 'phong-lon', // phòng làm việc lớn, mọi người gõ laptop
    duration: 4,
    fov: 45,
    ceiling: true,
    fog: NO_FOG,
    hero: 'seated',
    transition: 'fade',
    from: { position: [-2.4, 2.2, -6.3], target: [1.5, 0.9, -11.5] },
    to: { position: [-2.6, 2.1, -7.0], target: [1.6, 0.85, -11.3] },
  },
  {
    name: 'toan-canh', // bay lên nhìn toàn quán từ trên cao
    duration: 5,
    fov: 45,
    ceiling: false,
    fog: NO_FOG,
    hero: 'seated',
    transition: 'fade',
    from: { position: [-6.5, 3.2, 10.5], target: [-1.5, 1.2, 0.5] },
    to: { position: [-9.5, 14, 9.5], target: [0, 0, -4.5] },
  },
]

/** Thời điểm (giây, theo đồng hồ cảnh) bắt đầu cảnh quay `index`. Nhân vật chính bắt đầu đi ở cảnh 0. */
export function shotStart(index) {
  return WARM_UP + SHOTS.slice(0, index).reduce((sum, shot) => sum + shot.duration, 0)
}

export const frameCount = (shot) => Math.round(shot.duration * FPS)

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t)
const add = (a, b) => a.map((value, i) => value + b[i])

/** Vị trí và điểm nhìn của camera tại tiến độ `progress` (0 → 1), `hero` là vị trí nhân vật chính. */
export function cameraAt(shot, progress, hero) {
  const t = easeInOut(Math.min(Math.max(progress, 0), 1))
  let position = mix(shot.from.position, shot.to.position, t)
  let target = mix(shot.from.target, shot.to.target, t)
  if (shot.follow === 'both') position = add(position, hero)
  if (shot.follow === 'both' || shot.follow === 'target') target = add(target, hero)
  return { position, target }
}

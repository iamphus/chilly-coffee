// Kịch bản video nền landing: mỗi cảnh quay là một chuyển động camera từ `from` tới `to`.
// Toạ độ theo mét, giống cafe.meta.json (đã lật). Thời lượng tính bằng giây.
// Thứ tự cảnh = thứ tự trong video; cảnh cuối mờ dần sang đầu cảnh 1 để video lặp liền mạch.

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const CROSSFADE = 0.8 // giây chuyển cảnh giữa 2 cảnh quay

const STREET_FOG = [14, 30]
const NO_FOG = [60, 120]

export const SHOTS = [
  {
    name: 'pho-dem', // lướt dọc mặt tiền, người đi đường qua lại
    duration: 5,
    fov: 38,
    ceiling: true,
    fog: STREET_FOG,
    from: { position: [-10.5, 1.8, 12], target: [-3, 1.4, 3] },
    to: { position: [-7, 1.6, 10.5], target: [-1.6, 1.3, 2.5] },
  },
  {
    name: 'qua-cua-kinh', // nhìn qua kính trước thấy khách ngồi bàn
    duration: 4.5,
    fov: 30,
    ceiling: true,
    fog: STREET_FOG,
    from: { position: [0.6, 1.8, 6.0], target: [0.3, 1.0, 2.2] },
    to: { position: [0.1, 1.8, 5.7], target: [0.0, 1.0, 2.2] },
  },
  {
    name: 'ben-trong', // trong quán nhìn ra cửa kính, đèn vàng
    duration: 4.5,
    fov: 45,
    ceiling: true,
    fog: NO_FOG,
    from: { position: [3.0, 1.55, -2.3], target: [-1.5, 1.2, 2.8] },
    to: { position: [2.3, 1.45, -1.1], target: [-1.2, 1.1, 2.8] },
  },
  {
    name: 'phong-lon', // phòng làm việc lớn, mọi người gõ laptop
    duration: 4.5,
    fov: 45,
    ceiling: true,
    fog: NO_FOG,
    from: { position: [-2.4, 2.2, -6.3], target: [1.5, 0.9, -11.5] },
    to: { position: [-2.6, 2.1, -7.0], target: [1.6, 0.85, -11.3] },
  },
  {
    name: 'toan-canh', // bay lên nhìn toàn quán từ trên cao
    duration: 5,
    fov: 45,
    ceiling: false,
    fog: NO_FOG,
    from: { position: [-6.5, 3.2, 10.5], target: [-1.5, 1.2, 0.5] },
    to: { position: [-9.5, 14, 9.5], target: [0, 0, -4.5] },
  },
]

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t)

/** Vị trí và điểm nhìn của camera tại tiến độ `progress` (0 → 1) trong một cảnh quay. */
export function cameraAt(shot, progress) {
  const t = easeInOut(Math.min(Math.max(progress, 0), 1))
  return {
    position: mix(shot.from.position, shot.to.position, t),
    target: mix(shot.from.target, shot.to.target, t),
  }
}

export const frameCount = (shot) => Math.round(shot.duration * FPS)

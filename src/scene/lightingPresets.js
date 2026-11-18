// Thông số ánh sáng theo khung giờ trong ngày (bình minh → ngày → nắng chiều → chạng vạng → tối)
// và thời tiết (trời quang / mưa). Khi để chế độ 'auto' ("Theo giờ"), cảnh nội suy mượt theo đồng hồ máy tính.
import { Color } from 'three'

export const LIGHTING_PRESETS = {
  dawn: {
    sky: '#7f8fb5',
    environment: 0.34,
    hemisphere: 0.36,
    hemiSky: '#ffdcc2',
    sun: 0.42,
    sunColor: '#ffc891',
    sunPosition: [9, 5.5, 4],
    spot: 0.88,
    lampMultiplier: 1.15,
    lampGlow: 0.3,
    dust: 0.5,
    skyTop: '#4c74b8',
    skyHorizon: '#f3bfa0',
    moon: 0.06,
    stars: 0.14,
    clouds: 0.68,
    cloudColor: '#ffe0cc',
    lampHead: 1.4,
    fireflies: 0.12,
    fogNear: 24,
    fogFar: 78,
  },
  day: {
    sky: '#9fb4c6',
    environment: 0.35,
    hemisphere: 0.45,
    hemiSky: '#ffe9cc',
    sun: 0.75,
    sunColor: '#fff4e0',
    sunPosition: [-6, 10, 3],
    spot: 0.7,
    lampMultiplier: 1,
    lampGlow: 0.18,
    dust: 0.35,
    skyTop: '#7fb2e5',
    skyHorizon: '#f1e3c8',
    moon: 0,
    stars: 0,
    clouds: 0.95,
    cloudColor: '#ffffff',
    lampHead: 0.5,
    fireflies: 0,
    fogNear: 24,
    fogFar: 78,
  },
  sunset: {
    sky: '#7c6278',
    environment: 0.36,
    hemisphere: 0.36,
    hemiSky: '#ffb885',
    sun: 0.58,
    sunColor: '#ff944d',
    sunPosition: [-11.5, 4.5, 5.5], // nắng chiều xiên thấp, đổ bóng dài ấm áp
    spot: 0.92,
    lampMultiplier: 1.2,
    lampGlow: 0.38,
    dust: 0.62,
    skyTop: '#3b4d87',
    skyHorizon: '#f09462',
    moon: 0.05,
    stars: 0.12,
    clouds: 0.82,
    cloudColor: '#ffc099',
    lampHead: 1.85,
    fireflies: 0.28,
    fogNear: 22,
    fogFar: 75,
  },
  dusk: {
    sky: '#2c2b47',
    environment: 0.35,
    hemisphere: 0.22,
    hemiSky: '#a493cc',
    sun: 0.1,
    sunColor: '#ff7a52',
    sunPosition: [-12, 2.5, 6],
    spot: 1.04,
    lampMultiplier: 1.3,
    lampGlow: 0.5,
    dust: 0.7,
    skyTop: '#151e40',
    skyHorizon: '#59426e',
    moon: 0.24,
    stars: 0.68,
    clouds: 0.24,
    cloudColor: '#7c6b96',
    lampHead: 2.6,
    fireflies: 0.7,
    fogNear: 23,
    fogFar: 76,
  },
  night: {
    sky: '#15171c',
    environment: 0.35,
    hemisphere: 0.15,
    hemiSky: '#ffe9cc',
    sun: 0.03,
    sunColor: '#fff4e0',
    sunPosition: [-6, 10, 3],
    spot: 1.1,
    lampMultiplier: 1.35,
    lampGlow: 0.55,
    dust: 0.75,
    skyTop: '#0a0f24',
    skyHorizon: '#3a3560',
    moon: 0.32,
    stars: 1,
    clouds: 0,
    cloudColor: '#5c6480',
    lampHead: 3,
    fireflies: 0.9,
    fogNear: 24,
    fogFar: 78,
  },
}

const NUM_KEYS = [
  'environment',
  'hemisphere',
  'sun',
  'spot',
  'lampMultiplier',
  'lampGlow',
  'dust',
  'moon',
  'stars',
  'clouds',
  'lampHead',
  'fireflies',
  'fogNear',
  'fogFar',
]
const COLOR_KEYS = ['sky', 'hemiSky', 'sunColor', 'skyTop', 'skyHorizon', 'cloudColor']

const colA = new Color()
const colB = new Color()

const smoothstep = (t) => {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

export function lerpPreset(a, b, rawT) {
  const t = smoothstep(rawT)
  const out = {}
  for (const key of NUM_KEYS) out[key] = a[key] + (b[key] - a[key]) * t
  for (const key of COLOR_KEYS) {
    colA.set(a[key])
    colB.set(b[key])
    out[key] = `#${colA.lerp(colB, t).getHexString()}`
  }
  out.sunPosition = a.sunPosition.map((v, i) => v + (b.sunPosition[i] - v) * t)
  return out
}

// Lịch chuyển màu theo giờ thực trên máy người dùng (giờ thập phân 0..24)
const SCHEDULE = [
  [0.0, 'night'],
  [5.0, 'night'],
  [5.85, 'dawn'],
  [7.0, 'day'],
  [16.0, 'day'],
  [17.4, 'sunset'],
  [18.3, 'dusk'],
  [19.15, 'night'],
  [24.0, 'night'],
]

/** Nội suy thông số ánh sáng theo đúng giờ + phút trên đồng hồ máy tính. */
export function presetForClock(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  for (let i = 0; i < SCHEDULE.length - 1; i++) {
    const [h0, k0] = SCHEDULE[i]
    const [h1, k1] = SCHEDULE[i + 1]
    if (hour >= h0 && hour <= h1) {
      if (k0 === k1 || h1 === h0) return { ...LIGHTING_PRESETS[k0], sunPosition: [...LIGHTING_PRESETS[k0].sunPosition] }
      return lerpPreset(LIGHTING_PRESETS[k0], LIGHTING_PRESETS[k1], (hour - h0) / (h1 - h0))
    }
  }
  return { ...LIGHTING_PRESETS.day, sunPosition: [...LIGHTING_PRESETS.day.sunPosition] }
}

/** Áp hiệu ứng trời mưa lên bất kỳ thông số ánh sáng nào (dù đang là ngày, nắng chiều hay đêm). */
export function applyRain(base, rain) {
  if (!rain) return base
  // Đo độ tối hiện tại từ cường độ mặt trời (0 = đêm, 1 = trưa nắng)
  const daylight = Math.max(0, Math.min(1, (base.sun - 0.03) / 0.72))
  colA.set('#0c1018').lerp(colB.set('#8d99a6'), daylight)
  const rainTop = `#${colA.getHexString()}`
  colA.set('#252a38').lerp(colB.set('#b9bfc4'), daylight)
  const rainHorizon = `#${colA.getHexString()}`

  return {
    ...base,
    skyTop: rainTop,
    skyHorizon: rainHorizon,
    sky: rainHorizon,
    cloudColor: daylight > 0.3 ? '#aeb6bf' : '#3a4152',
    sun: base.sun * 0.42,
    hemisphere: base.hemisphere * 0.86,
    moon: base.moon * 0.56,
    stars: 0,
    fireflies: 0,
    clouds: daylight > 0.15 ? 0.9 : 0.15,
    fogNear: 10 + daylight * 2,
    fogFar: 50 + daylight * 5,
  }
}

// Thêm ?time=day | sunset | night vào URL để xem thử nhanh
const requestedTime = (() => {
  try {
    return new URLSearchParams(window.location.search).get('time')
  } catch {
    return null
  }
})()

/** Thông số mục tiêu theo cài đặt ('auto' | 'day' | 'sunset' | 'night'), giờ máy và trạng thái mưa. */
export function lightingFor(setting = 'auto', rain = false, date = new Date()) {
  const chosen = LIGHTING_PRESETS[requestedTime]
    ? requestedTime
    : LIGHTING_PRESETS[setting]
      ? setting
      : 'auto'
  const base =
    chosen === 'auto'
      ? presetForClock(date)
      : { ...LIGHTING_PRESETS[chosen], sunPosition: [...LIGHTING_PRESETS[chosen].sunPosition] }
  return applyRain(base, rain)
}

/** Có phải buổi tối không (để bật tiếng dế / tắt tiếng chim trong tạp âm phố). */
export function isNightTime(setting = 'auto', date = new Date()) {
  const chosen = LIGHTING_PRESETS[requestedTime] ? requestedTime : setting
  if (chosen === 'night' || chosen === 'dusk') return true
  if (chosen === 'day' || chosen === 'sunset' || chosen === 'dawn') return false
  const hour = date.getHours() + date.getMinutes() / 60
  return hour >= 18.25 || hour < 5.75
}

export function presetForHour(hour) {
  return hour >= 18 || hour < 6 ? 'night' : 'day'
}

export function effectiveTimeOfDay(setting) {
  return isNightTime(setting) ? 'night' : 'day'
}

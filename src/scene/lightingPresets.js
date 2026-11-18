// Thông số ánh sáng theo khung giờ trong ngày (bình minh → nắng sớm → trưa → xế chiều → hoàng hôn → chạng vạng → tối)
// và thời tiết (trời quang / mưa). Khi để chế độ 'auto' ("Theo giờ"), mặt trời xoay liên tục trên vòm trời từ Đông sang Tây
// theo đúng giờ + phút máy tính, kéo theo hướng bóng đổ và vệt nắng qua khung cửa kính.
import { Color } from 'three'

export const SUN_TARGET = [-1.5, 0, -2.5]
export const MOON_DIRECTION = [-0.45, 0.42, 0.79]

const NIGHT_MOON_POS = [
  SUN_TARGET[0] + MOON_DIRECTION[0] * 24,
  SUN_TARGET[1] + MOON_DIRECTION[1] * 24,
  SUN_TARGET[2] + MOON_DIRECTION[2] * 24,
]

export const LIGHTING_PRESETS = {
  predawn: {
    sky: '#242742',
    environment: 0.34,
    hemisphere: 0.19,
    hemiSky: '#8f8ec4',
    sun: 0.04,
    sunColor: '#c9b8ff',
    sunPosition: [10.4, 2.4, 11.2],
    shadowRadius: 3.6,
    sunbeam: 0,
    sunGlow: 0.08,
    spot: 1.05,
    lampMultiplier: 1.3,
    lampGlow: 0.48,
    dust: 0.65,
    skyTop: '#141d3d',
    skyHorizon: '#4c436e',
    moon: 0.18,
    stars: 0.58,
    clouds: 0.25,
    cloudColor: '#766d96',
    lampHead: 2.5,
    fireflies: 0.55,
    fogNear: 23,
    fogFar: 76,
  },
  dawn: {
    sky: '#7f8fb5',
    environment: 0.34,
    hemisphere: 0.36,
    hemiSky: '#ffdcc2',
    sun: 0.48,
    sunColor: '#ffc288',
    sunPosition: [9.6, 4.2, 11.9],
    shadowRadius: 2.9,
    sunbeam: 0.82,
    sunGlow: 0.92,
    spot: 0.86,
    lampMultiplier: 1.12,
    lampGlow: 0.28,
    dust: 0.52,
    skyTop: '#4c74b8',
    skyHorizon: '#f3bfa0',
    moon: 0.04,
    stars: 0.1,
    clouds: 0.7,
    cloudColor: '#ffe0cc',
    lampHead: 1.3,
    fireflies: 0.1,
    fogNear: 23,
    fogFar: 77,
  },
  morning: {
    sky: '#9bb3c9',
    environment: 0.35,
    hemisphere: 0.44,
    hemiSky: '#ffebd2',
    sun: 0.72,
    sunColor: '#ffefd4',
    sunPosition: [5.3, 10.3, 14.4],
    shadowRadius: 1.85,
    sunbeam: 0.68,
    sunGlow: 0.95,
    spot: 0.72,
    lampMultiplier: 1.0,
    lampGlow: 0.19,
    dust: 0.42,
    skyTop: '#73ace3',
    skyHorizon: '#f5e4c8',
    moon: 0,
    stars: 0,
    clouds: 0.9,
    cloudColor: '#fffcf7',
    lampHead: 0.55,
    fireflies: 0,
    fogNear: 24,
    fogFar: 78,
  },
  day: {
    sky: '#9fb4c6',
    environment: 0.35,
    hemisphere: 0.46,
    hemiSky: '#ffe9cc',
    sun: 0.78,
    sunColor: '#fff5e4',
    sunPosition: [-7.5, 13.8, 14.5], // chế độ bấm tay "Ngày": nắng trong trẻo chiếu chéo cả mặt tiền lẫn hông hẻm
    shadowRadius: 1.45,
    sunbeam: 0.46,
    sunGlow: 0.9,
    spot: 0.68,
    lampMultiplier: 0.98,
    lampGlow: 0.17,
    dust: 0.35,
    skyTop: '#7fb2e5',
    skyHorizon: '#f1e3c8',
    moon: 0,
    stars: 0,
    clouds: 0.95,
    cloudColor: '#ffffff',
    lampHead: 0.45,
    fireflies: 0,
    fogNear: 24,
    fogFar: 78,
  },
  afternoon: {
    sky: '#9cb0c2',
    environment: 0.35,
    hemisphere: 0.43,
    hemiSky: '#ffe0bd',
    sun: 0.74,
    sunColor: '#ffe3b8',
    sunPosition: [-11.4, 11.8, 12.7],
    shadowRadius: 1.95,
    sunbeam: 0.66,
    sunGlow: 0.95,
    spot: 0.75,
    lampMultiplier: 1.04,
    lampGlow: 0.22,
    dust: 0.46,
    skyTop: '#6ea2dc',
    skyHorizon: '#f3d7b3',
    moon: 0,
    stars: 0,
    clouds: 0.9,
    cloudColor: '#fff3e3',
    lampHead: 0.75,
    fireflies: 0,
    fogNear: 24,
    fogFar: 77,
  },
  sunset: {
    sky: '#7c6278',
    environment: 0.36,
    hemisphere: 0.36,
    hemiSky: '#ffb885',
    sun: 0.62,
    sunColor: '#ff944d',
    sunPosition: [-15.7, 5.0, 8.9], // nắng chiều xiên thấp hướng Tây-Nam, rọi bóng dài & tia nắng vàng sâu vào quán
    shadowRadius: 3.0,
    sunbeam: 1.0,
    sunGlow: 1.0,
    spot: 0.92,
    lampMultiplier: 1.2,
    lampGlow: 0.38,
    dust: 0.65,
    skyTop: '#3b4d87',
    skyHorizon: '#f09462',
    moon: 0.04,
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
    sun: 0.05,
    sunColor: '#ff7a52',
    sunPosition: [-16.9, 2.3, 7.3],
    shadowRadius: 3.6,
    sunbeam: 0.12,
    sunGlow: 0.22,
    spot: 1.04,
    lampMultiplier: 1.3,
    lampGlow: 0.5,
    dust: 0.7,
    skyTop: '#151e40',
    skyHorizon: '#59426e',
    moon: 0.22,
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
    // Tận dụng chính đèn đổ bóng duy nhất chuyển sang hướng & sắc xanh bạc của ánh trăng để cây cối, giàn hoa đổ bóng đêm dịu
    sun: 0.18,
    sunColor: '#9fb2ff',
    sunPosition: [...NIGHT_MOON_POS],
    shadowRadius: 3.4,
    sunbeam: 0,
    sunGlow: 0,
    spot: 1.1,
    lampMultiplier: 1.35,
    lampGlow: 0.55,
    dust: 0.75,
    skyTop: '#0a0f24',
    skyHorizon: '#3a3560',
    moon: 0.14,
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
  'shadowRadius',
  'sunbeam',
  'sunGlow',
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

const lerpVec3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * Quỹ đạo mặt trời liên tục theo giờ thập phân (0..24):
 * - 05:30 → 18:15: mọc hướng Đông-Nam (+x, +z), lên đỉnh lúc ~11:55 trưa, lặn dần về Tây-Nam (-x, +z) để rọi xiên vào quán.
 * - Ban đêm: chuyển êm về đúng hướng mặt trăng để tạo bóng trăng dịu ngoài sân vườn & công viên.
 */
export function sunPositionForHour(hour) {
  const h = ((hour % 24) + 24) % 24
  const DAY_START = 5.5
  const DAY_END = 18.25

  if (h >= DAY_START && h <= DAY_END) {
    const u = (h - DAY_START) / (DAY_END - DAY_START)
    const azimuth = (0.46 - u * 1.1) * (Math.PI * 0.5)
    const horiz = 18.2
    const dx = horiz * Math.sin(azimuth)
    const dy = 2.3 + 13.9 * Math.sin(Math.PI * u)
    const dz = horiz * Math.cos(azimuth)
    return [SUN_TARGET[0] + dx, SUN_TARGET[1] + dy, SUN_TARGET[2] + dz]
  }

  const sunrise = sunPositionForHour(DAY_START)
  const sunsetEnd = sunPositionForHour(DAY_END)

  if (h > DAY_END && h < 19.15) {
    return lerpVec3(sunsetEnd, NIGHT_MOON_POS, smoothstep((h - DAY_END) / (19.15 - DAY_END)))
  }
  if (h > 4.9 && h < DAY_START) {
    return lerpVec3(NIGHT_MOON_POS, sunrise, smoothstep((h - 4.9) / (DAY_START - 4.9)))
  }
  return [...NIGHT_MOON_POS]
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
  out.sunPosition = lerpVec3(a.sunPosition, b.sunPosition, t)
  return out
}

// Lịch chuyển sắc thái ánh sáng theo giờ thực trên máy người dùng (giờ thập phân 0..24)
const SCHEDULE = [
  [0.0, 'night'],
  [4.9, 'night'],
  [5.35, 'predawn'],
  [5.9, 'dawn'],
  [8.0, 'morning'],
  [12.0, 'day'],
  [15.2, 'afternoon'],
  [17.4, 'sunset'],
  [18.3, 'dusk'],
  [19.15, 'night'],
  [24.0, 'night'],
]

/** Nội suy thông số ánh sáng + vị trí bóng nắng theo đúng giờ + phút trên đồng hồ máy tính. */
export function presetForClock(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  let out = null
  for (let i = 0; i < SCHEDULE.length - 1; i++) {
    const [h0, k0] = SCHEDULE[i]
    const [h1, k1] = SCHEDULE[i + 1]
    if (hour >= h0 && hour <= h1) {
      out =
        k0 === k1 || h1 === h0
          ? { ...LIGHTING_PRESETS[k0] }
          : lerpPreset(LIGHTING_PRESETS[k0], LIGHTING_PRESETS[k1], (hour - h0) / (h1 - h0))
      break
    }
  }
  if (!out) out = { ...LIGHTING_PRESETS.day }
  out.sunPosition = sunPositionForHour(hour)
  return out
}

/** Áp hiệu ứng trời mưa lên bất kỳ thông số ánh sáng nào (dù đang là ngày, nắng chiều hay đêm). */
export function applyRain(base, rain) {
  if (!rain) return base
  // Đo độ sáng ban ngày từ bầu trời bán cầu & vầng dương (0 = đêm, 1 = ban ngày)
  const daylight = Math.max(0, Math.min(1, (base.hemisphere - 0.16) / 0.28))
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
    sun: base.sun * 0.38,
    shadowRadius: Math.max(base.shadowRadius ?? 2, 4.0), // mây mù làm nhòe mềm biên bóng đổ
    sunbeam: (base.sunbeam ?? 0) * 0.05,
    sunGlow: 0,
    hemisphere: base.hemisphere * 0.86,
    moon: base.moon * 0.56,
    stars: 0,
    fireflies: 0,
    clouds: daylight > 0.15 ? 0.9 : 0.15,
    fogNear: 10 + daylight * 2,
    fogFar: 50 + daylight * 5,
  }
}

// Thêm ?time=dawn | morning | day | afternoon | sunset | dusk | night vào URL để xem thử nhanh
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
  if (chosen === 'night' || chosen === 'dusk' || chosen === 'predawn') return true
  if (chosen === 'day' || chosen === 'morning' || chosen === 'afternoon' || chosen === 'sunset' || chosen === 'dawn') {
    return false
  }
  const hour = date.getHours() + date.getMinutes() / 60
  return hour >= 18.25 || hour < 5.75
}

export function presetForHour(hour) {
  return hour >= 18 || hour < 6 ? 'night' : 'day'
}

export function effectiveTimeOfDay(setting) {
  return isNightTime(setting) ? 'night' : 'day'
}

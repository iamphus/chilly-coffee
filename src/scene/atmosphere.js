// Trạng thái bầu trời & ánh sáng nội suy mượt mỗi khung hình (60 fps, 0 re-render React, 0 biên dịch lại shader).
// Khi người dùng đổi Ngày ↔ Nắng chiều ↔ Tối hoặc bật/tắt Mưa, mọi màu sắc và cường độ chuyển êm trong ~1,2 giây.
import { Color } from 'three'

const TRANSITION_TAU = 0.38 // giây (~1.1s là chuyển xong)
const EPSILON = 0.002

const NUM_FIELDS = [
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

const COLOR_FIELDS = ['sky', 'hemiSky', 'sunColor', 'skyTop', 'skyHorizon', 'cloudColor']

export function createAtmosphere(initialPreset) {
  const colors = {}
  const targetColors = {}
  for (const key of COLOR_FIELDS) {
    colors[key] = new Color(initialPreset[key])
    targetColors[key] = new Color(initialPreset[key])
  }

  const values = {}
  const targets = {}
  for (const key of NUM_FIELDS) {
    const initVal = initialPreset[key] ?? 0
    values[key] = initVal
    targets[key] = initVal
  }

  return {
    values,
    targets,
    colors,
    targetColors,
    sunPosition: [...(initialPreset.sunPosition ?? [-6, 10, 3])],
    targetSunPosition: [...(initialPreset.sunPosition ?? [-6, 10, 3])],
    settled: false, // false ở khung hình đầu để các component áp giá trị ban đầu
    version: 0,
  }
}

export function setAtmosphereTarget(atmo, preset) {
  for (const key of NUM_FIELDS) atmo.targets[key] = preset[key] ?? 0
  for (const key of COLOR_FIELDS) atmo.targetColors[key].set(preset[key])
  const sp = preset.sunPosition ?? [-6, 10, 3]
  atmo.targetSunPosition[0] = sp[0]
  atmo.targetSunPosition[1] = sp[1]
  atmo.targetSunPosition[2] = sp[2]
  atmo.settled = false
}

/** Tiến một bước nội suy theo `dt` giây. Trả về `true` nếu bầu trời/ánh sáng vừa thay đổi ở khung hình này. */
export function stepAtmosphere(atmo, dt) {
  if (atmo.settled) return false
  const k = 1 - Math.exp(-Math.min(dt, 0.1) / TRANSITION_TAU)
  let maxDiff = 0

  for (const key of NUM_FIELDS) {
    const diff = atmo.targets[key] - atmo.values[key]
    maxDiff = Math.max(maxDiff, Math.abs(diff))
    atmo.values[key] = Math.abs(diff) < EPSILON ? atmo.targets[key] : atmo.values[key] + diff * k
  }

  for (let i = 0; i < 3; i++) {
    const diff = atmo.targetSunPosition[i] - atmo.sunPosition[i]
    maxDiff = Math.max(maxDiff, Math.abs(diff) * 0.05)
    atmo.sunPosition[i] = Math.abs(diff) < EPSILON ? atmo.targetSunPosition[i] : atmo.sunPosition[i] + diff * k
  }

  for (const key of COLOR_FIELDS) {
    const c = atmo.colors[key]
    const t = atmo.targetColors[key]
    const dr = t.r - c.r
    const dg = t.g - c.g
    const db = t.b - c.b
    maxDiff = Math.max(maxDiff, Math.abs(dr), Math.abs(dg), Math.abs(db))
    if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) < EPSILON) {
      c.copy(t)
    } else {
      c.r += dr * k
      c.g += dg * k
      c.b += db * k
    }
  }

  atmo.version += 1
  if (maxDiff < EPSILON) atmo.settled = true
  return true
}

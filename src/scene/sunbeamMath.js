import { Color } from 'three'
import { SUN_TARGET } from './lightingPresets.js'

const MAIN_ROOM = { minX: -3.52, maxX: 3.45, minZ: -2.92, maxZ: 3.06, minY: 0.04 }
const STUDY_HALL = { minX: -3.52, maxX: 3.45, minZ: -12.92, maxZ: -6.28, minY: 0.04 }

// 11 ô kính & ô cửa đón nắng thực tế trong cafe.glb (tách đúng ngay tại các thanh đố cửa màu đen)
export const WINDOW_PANES = [
  // Phòng chính — cửa kính mặt tiền nhìn ra phố (+z)
  { id: 'front_w', center: [-0.5, 1.8, 3.05], width: 1.24, height: 1.76, normal: [0, 0, -1], tangent: [1, 0, 0], maxLen: 4.6, weight: 1.0, bounds: MAIN_ROOM },
  { id: 'front_e', center: [0.9, 1.8, 3.05], width: 1.24, height: 1.76, normal: [0, 0, -1], tangent: [1, 0, 0], maxLen: 4.6, weight: 1.0, bounds: MAIN_ROOM },
  // Phòng chính — cửa kính bên hông nhìn ra hẻm (-x)
  { id: 'side_n', center: [-3.54, 1.68, 1.38], width: 0.82, height: 1.72, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 4.8, weight: 1.0, bounds: MAIN_ROOM },
  { id: 'side_s', center: [-3.54, 1.68, 2.32], width: 0.82, height: 1.72, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 4.8, weight: 1.0, bounds: MAIN_ROOM },
  // Phòng chính — ô cửa ra vào luôn mở (-x)
  { id: 'door_main', center: [-3.54, 1.32, -0.5], width: 0.94, height: 1.88, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 3.5, weight: 0.72, bounds: MAIN_ROOM },
  // Phòng làm việc lớn — vách kính nhìn ra sân vườn (+z)
  { id: 'hall_yard_w', center: [-2.35, 1.42, -6.3], width: 1.16, height: 2.15, normal: [0, 0, -1], tangent: [1, 0, 0], maxLen: 4.4, weight: 0.84, bounds: STUDY_HALL },
  { id: 'hall_yard_e', center: [-1.05, 1.42, -6.3], width: 1.16, height: 2.15, normal: [0, 0, -1], tangent: [1, 0, 0], maxLen: 4.4, weight: 0.84, bounds: STUDY_HALL },
  // Phòng làm việc lớn — cửa sổ hẻm 1 sát bàn 21–22 (-x)
  { id: 'hall_w1_a', center: [-3.54, 1.65, -7.59], width: 1.04, height: 1.58, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 5.0, weight: 1.0, bounds: STUDY_HALL },
  { id: 'hall_w1_b', center: [-3.54, 1.65, -8.76], width: 1.04, height: 1.58, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 5.0, weight: 1.0, bounds: STUDY_HALL },
  // Phòng làm việc lớn — cửa sổ hẻm 2 sát bàn 23–24 (-x)
  { id: 'hall_w2_a', center: [-3.54, 1.65, -10.19], width: 1.04, height: 1.58, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 5.0, weight: 1.0, bounds: STUDY_HALL },
  { id: 'hall_w2_b', center: [-3.54, 1.65, -11.36], width: 1.04, height: 1.58, normal: [1, 0, 0], tangent: [0, 0, 1], maxLen: 5.0, weight: 1.0, bounds: STUDY_HALL },
]

// Mỗi ô kính gồm 3 dải sáng mỏng đan chéo (2 dải ngang theo chiều cao khác nhau + 1 dải dọc chiều sâu)
// để nhìn từ góc nghiêng hay đi dọc hành lang đều thấy luồng nắng có khối mềm mại, chỉ tốn đúng 1 draw call.
export const SHEETS_PER_PANE = 3
export const QUAD_COUNT = WINDOW_PANES.length * SHEETS_PER_PANE
export const VERT_COUNT = QUAD_COUNT * 4

const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Giới hạn chiều dài tia nắng để luôn chạm sàn hoặc dừng trước tường trong phòng, không bao giờ xuyên tường. */
export function clampRayLength(sx, sy, sz, dx, dy, dz, bounds, maxLen) {
  let t = maxLen
  if (dy < -1e-4) t = Math.min(t, (bounds.minY - sy) / dy)
  if (dx > 1e-4) t = Math.min(t, (bounds.maxX - sx) / dx)
  else if (dx < -1e-4) t = Math.min(t, (bounds.minX - sx) / dx)
  if (dz > 1e-4) t = Math.min(t, (bounds.maxZ - sz) / dz)
  else if (dz < -1e-4) t = Math.min(t, (bounds.minZ - sz) / dz)
  return Math.max(0.05, t)
}

function writeQuad(positions, colors, quadIndex, s0x, s0y, s0z, s1x, s1y, s1z, dx, dy, dz, bounds, maxLen, r, g, b) {
  const t0 = clampRayLength(s0x, s0y, s0z, dx, dy, dz, bounds, maxLen)
  const t1 = clampRayLength(s1x, s1y, s1z, dx, dy, dz, bounds, maxLen)
  const base = quadIndex * 12

  positions[base] = s0x
  positions[base + 1] = s0y
  positions[base + 2] = s0z

  positions[base + 3] = s1x
  positions[base + 4] = s1y
  positions[base + 5] = s1z

  positions[base + 6] = s1x + dx * t1
  positions[base + 7] = s1y + dy * t1
  positions[base + 8] = s1z + dz * t1

  positions[base + 9] = s0x + dx * t0
  positions[base + 10] = s0y + dy * t0
  positions[base + 11] = s0z + dz * t0

  // Đỉnh sát kính đậm hơn, đỉnh chạm sàn dịu lại để chuyển êm xuống mặt gỗ
  const endFade = 0.45
  colors[base] = r
  colors[base + 1] = g
  colors[base + 2] = b
  colors[base + 3] = r
  colors[base + 4] = g
  colors[base + 5] = b
  colors[base + 6] = r * endFade
  colors[base + 7] = g * endFade
  colors[base + 8] = b * endFade
  colors[base + 9] = r * endFade
  colors[base + 10] = g * endFade
  colors[base + 11] = b * endFade
}

const warmCream = new Color('#fff6e5')
const beamColorScratch = new Color()

/**
 * Cập nhật toàn bộ đỉnh & màu đỉnh của các luồng tia nắng theo vị trí mặt trời hiện tại.
 * Trả về số ô kính đang thực sự đón nắng trực tiếp (> 0 thì bật mesh).
 */
export function fillSunbeamBuffers(positions, colors, sunPosition, sunColor, sunbeamStrength) {
  if (sunbeamStrength <= 0.004) return 0

  const sp = sunPosition ?? [-7.5, 13.8, 14.5]
  const toSunX = sp[0] - SUN_TARGET[0]
  const toSunY = sp[1] - SUN_TARGET[1]
  const toSunZ = sp[2] - SUN_TARGET[2]
  const dist = Math.hypot(toSunX, toSunY, toSunZ) || 1

  // Vector tia nắng đi từ ngoài trời xuyên vào trong phòng
  const dx = -toSunX / dist
  const dy = -toSunY / dist
  const dz = -toSunZ / dist

  // Mặt trời dưới đường chân trời thì không có tia nắng chiếu xuống
  const horizonFactor = smoothstep(0.06, 0.2, -dy)
  if (horizonFactor <= 0.001) return 0

  beamColorScratch.copy(sunColor).lerp(warmCream, 0.28)
  let litPanes = 0

  for (let p = 0; p < WINDOW_PANES.length; p++) {
    const pane = WINDOW_PANES[p]
    const inwardDot = dx * pane.normal[0] + dy * pane.normal[1] + dz * pane.normal[2]
    const facing = smoothstep(0.08, 0.52, inwardDot)
    const strength = sunbeamStrength * horizonFactor * facing * pane.weight

    const [cx, cy, cz] = pane.center
    const [ux, , uz] = pane.tangent
    const halfW = pane.width * 0.48
    const halfH = pane.height * 0.42
    const qBase = p * SHEETS_PER_PANE

    if (strength <= 0.002) {
      for (let s = 0; s < SHEETS_PER_PANE; s++) {
        writeQuad(positions, colors, qBase + s, cx, cy, cz, cx, cy, cz, 0, -1, 0, pane.bounds, 0.05, 0, 0, 0)
      }
      continue
    }

    litPanes += 1
    const rA = beamColorScratch.r * strength * 0.062
    const gA = beamColorScratch.g * strength * 0.062
    const bA = beamColorScratch.b * strength * 0.062

    // Dải 1: màn nắng rộng từ phần trên khung kính đổ xiên xuống sàn
    const yUpper = cy + pane.height * 0.28
    writeQuad(
      positions,
      colors,
      qBase,
      cx - ux * halfW,
      yUpper,
      cz - uz * halfW,
      cx + ux * halfW,
      yUpper,
      cz + uz * halfW,
      dx,
      dy,
      dz,
      pane.bounds,
      pane.maxLen,
      rA,
      gA,
      bA,
    )

    // Dải 2: màn nắng tầng giữa khung kính tạo độ dày khối 3D
    const yMid = cy - pane.height * 0.08
    const midW = halfW * 0.92
    writeQuad(
      positions,
      colors,
      qBase + 1,
      cx - ux * midW,
      yMid,
      cz - uz * midW,
      cx + ux * midW,
      yMid,
      cz + uz * midW,
      dx,
      dy,
      dz,
      pane.bounds,
      pane.maxLen * 0.92,
      rA * 0.78,
      gA * 0.78,
      bA * 0.78,
    )

    // Dải 3: mặt cắt dọc tâm kính giúp nhìn dọc hành lang vẫn thấy vệt nắng xiên rõ rệt
    writeQuad(
      positions,
      colors,
      qBase + 2,
      cx,
      cy - halfH,
      cz,
      cx,
      cy + halfH,
      cz,
      dx,
      dy,
      dz,
      pane.bounds,
      pane.maxLen,
      rA * 0.85,
      gA * 0.85,
      bA * 0.85,
    )
  }

  return litPanes
}

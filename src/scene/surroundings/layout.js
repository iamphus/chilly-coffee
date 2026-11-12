// Bố cục khung cảnh bên ngoài quán (toạ độ thế giới, mét). Thuần dữ liệu: các component chỉ việc vẽ.
//
//   ┌──────────────── công viên trước (đài phun nước, quảng trường, bồn hoa) ────────────────┐
//   │                              z > 7.6                                                    │
//   ├──── đường trước quán (z 4.7 … 7.5) ─────────────────────────────────────────────────────┤
//   │ vườn hồ sen │ hẻm │                QUÁN (x −3.8 … 3.8, z −13.5 … 3.2)          │ vườn │
//   │  x < −8.6   │     │                                                              │ x>5.6│
//   └─────────────┴─────┴──────────────────────────────────────────────────────────────┴──────┘
// Sinh ngẫu nhiên có seed cố định nên lần nào mở cũng giống nhau.

function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}
const random = seeded(20261112)
const between = (min, max) => min + random() * (max - min)
const pick = (list) => list[Math.floor(random() * list.length)]

// ---------------- kích thước chính ----------------
export const FRONT_STREET = { zMin: 4.7, zMax: 7.5 } // đường trước quán
export const ALLEY = { xMin: -8.5, xMax: -5.4 } // hẻm bên trái quán
const FRONT_CURB_Z = 7.65
const LEFT_CURB_X = -8.65
const RIGHT_EDGE_X = 5.6
const BACK_EDGE_Z = -16.6
export const FOUNTAIN = { x: -1, z: 14.5, basin: 1.9, plaza: 4.4 }
export const POND = { x: -17, z: -1.5, radius: 3.4 }
const FRONT_GATES = [-1, -14, 12] // lối vào công viên trước (x)
const LEFT_GATE_Z = -0.5 // lối vào vườn hồ sen, đối diện cửa quán

// ---------------- màu ----------------
const FLOWER_COLORS = ['#ff8fab', '#ffd166', '#ffffff', '#c39bd3', '#ff6b6b', '#ffa94d', '#f7a8d8']
const LEAF_COLORS = ['#5c9e4a', '#6fb35a', '#4a8a3c', '#7cbf5e']
const BLOSSOM_COLORS = {
  cherry: ['#f8b4cf', '#f4a6c6', '#fbc8dc'], // anh đào hồng
  lagerstroemia: ['#b48fd6', '#a77fd0', '#c4a2e2'], // bằng lăng tím
  flamboyant: ['#e8553e', '#f06a45', '#d9452f'], // phượng đỏ
}

// ---------------- tiện ích ----------------
const box = (x, y, z, sx, sy, sz, rotationY = 0, color) => ({ position: [x, y, z], scale: [sx, sy, sz], rotationY, color })
const nearAny = (value, centers, radius) => centers.some((center) => Math.abs(value - center) < radius)

/** Đoạn đường lát gạch từ a tới b (hộp phẳng xoay theo hướng đoạn). */
function pathSegment([ax, az], [bx, bz], width = 1.6) {
  const length = Math.hypot(bx - ax, bz - az)
  return box((ax + bx) / 2, 0.012, (az + bz) / 2, width, 0.024, length, Math.atan2(bx - ax, bz - az))
}

// ---------------- mặt đất ----------------
export const roads = [
  // Đường trước quán kéo dài hai phía, hẻm kéo dài ra sau, dải đường bên phải quán
  box(-30, -0.012, (FRONT_STREET.zMin + FRONT_STREET.zMax) / 2, 43, 0.02, FRONT_STREET.zMax - FRONT_STREET.zMin),
  box(27, -0.012, (FRONT_STREET.zMin + FRONT_STREET.zMax) / 2, 43, 0.02, FRONT_STREET.zMax - FRONT_STREET.zMin),
  box((ALLEY.xMin + ALLEY.xMax) / 2, -0.012, -30, ALLEY.xMax - ALLEY.xMin, 0.02, 27),
]

// Vạch kẻ đường đứt khúc giữa đường trước
export const roadMarks = []
for (let x = -46; x <= 46; x += 3) {
  if (x > -9 && x < 6) continue // đoạn trước quán đã có mặt đường gốc
  roadMarks.push(box(x, 0.003, (FRONT_STREET.zMin + FRONT_STREET.zMax) / 2, 1.4, 0.01, 0.12))
}

export const curbs = [
  box(0, 0.06, FRONT_CURB_Z, 100, 0.14, 0.28),
  box(LEFT_CURB_X, 0.06, -20, 0.28, 0.14, 50),
  box(RIGHT_EDGE_X, 0.06, -6, 0.28, 0.14, 21.4),
  box(-1.5, 0.06, BACK_EDGE_Z, 14.2, 0.14, 0.28),
]

// ---------------- hàng rào cây thấp ----------------
// Mỗi khúc là một khối bo tròn kích thước HEDGE (Ground.jsx), xoay 90° cho các hàng chạy dọc trục z
export const HEDGE = { length: 1.9, height: 0.64, depth: 0.6 }
export const hedges = []
const hedge = (x, z, rotationY) => {
  const height = HEDGE.height * between(0.92, 1.12)
  hedges.push({ position: [x, height / 2, z], scale: [1, height / HEDGE.height, 1], rotationY, color: pick(LEAF_COLORS) })
}
for (let x = -46; x <= 46; x += HEDGE.length + 0.08) if (!nearAny(x, FRONT_GATES, 1.6)) hedge(x, FRONT_CURB_Z + 0.55, 0)
for (let z = 4.2; z >= -44; z -= HEDGE.length + 0.08) if (Math.abs(z - LEFT_GATE_Z) > 1.6) hedge(LEFT_CURB_X - 0.55, z, Math.PI / 2)
for (let z = 4; z >= -15.5; z -= HEDGE.length + 0.08) hedge(RIGHT_EDGE_X + 0.5, z, Math.PI / 2)

// ---------------- lối đi lát gạch ----------------
const { x: fx, z: fz, plaza } = FOUNTAIN
export const plazas = [
  { position: [fx, 0.01, fz], radius: plaza }, // quảng trường quanh đài phun nước
  { position: [POND.x, 0.008, POND.z], radius: POND.radius + 2.2 }, // lối đi vòng quanh hồ
]
export const paths = [
  pathSegment([fx, FRONT_CURB_Z], [fx, fz - plaza + 0.3], 2.0), // cổng chính → đài phun nước
  pathSegment([-14, FRONT_CURB_Z], [fx - plaza * 0.7, fz - plaza * 0.7]), // cổng trái
  pathSegment([12, FRONT_CURB_Z], [fx + plaza * 0.7, fz - plaza * 0.7]), // cổng phải
  pathSegment([fx, fz + plaza - 0.3], [fx, 34]), // đi sâu vào công viên
  pathSegment([fx - plaza + 0.3, fz], [-26, fz + 3]),
  pathSegment([fx + plaza - 0.3, fz], [24, fz + 3]),
  pathSegment([LEFT_CURB_X, LEFT_GATE_Z], [POND.x + POND.radius + 1.4, LEFT_GATE_Z], 1.8), // cổng vườn → hồ
  pathSegment([POND.x, POND.z - POND.radius - 1.6], [POND.x - 4, -26]),
]
const PATH_ANGLES = [-Math.PI / 2, -Math.PI / 2 - 0.85, -Math.PI / 2 + 0.85, Math.PI / 2, Math.PI - 0.1, 0.1] // hướng các lối ra từ quảng trường

// Đá lát bước qua bãi cỏ (vườn hồ sen)
export const steppingStones = []
for (let i = 0; i < 7; i++) {
  steppingStones.push({ position: [POND.x + 5.8 + i * 0.75, 0.02, POND.z - 2.6 - i * 0.55 + between(-0.1, 0.1)], scale: [0.32, 0.04, 0.24], rotationY: between(0, 3) })
}

// ---------------- bồn hoa ----------------
export const flowerBeds = [] // đất (vòng tròn / hình chữ nhật thấp)
export const flowers = [] // { position, scale, color }
export const flowerLeaves = [] // bụi lá dưới hoa

function addFlower(x, z) {
  const height = between(0.18, 0.34)
  flowers.push({ position: [x, height, z], scale: between(0.06, 0.1), color: pick(FLOWER_COLORS) })
  if (random() < 0.35) flowerLeaves.push({ position: [x, 0.08, z], scale: [between(0.16, 0.24), 0.14, between(0.16, 0.24)], color: pick(LEAF_COLORS) })
}

/** Bồn hoa hình vành khuyên quanh tâm, chừa các lối đi. */
function ringBed(cx, cz, inner, outer, avoidAngles, count) {
  flowerBeds.push({ type: 'ring', position: [cx, 0.015, cz], inner, outer })
  let placed = 0
  while (placed < count) {
    const angle = between(-Math.PI, Math.PI)
    if (avoidAngles.some((a) => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.24)) continue
    const radius = Math.sqrt(between(inner * inner, outer * outer))
    addFlower(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius)
    placed++
  }
}

/** Luống hoa hình chữ nhật dọc theo một trục, chừa các cổng. */
function stripBed(xMin, xMax, zMin, zMax, density, skip) {
  const step = 1.2
  const alongX = xMax - xMin > zMax - zMin
  for (let t = alongX ? xMin : zMin; t < (alongX ? xMax : zMax); t += step) {
    if (skip(t)) continue
    const cx = alongX ? t + step / 2 : (xMin + xMax) / 2
    const cz = alongX ? (zMin + zMax) / 2 : t + step / 2
    flowerBeds.push({ type: 'box', ...box(cx, 0.03, cz, alongX ? step - 0.05 : xMax - xMin, 0.06, alongX ? zMax - zMin : step - 0.05) })
    for (let i = 0; i < density; i++) {
      addFlower(between(alongX ? t + 0.05 : xMin + 0.1, alongX ? t + step - 0.05 : xMax - 0.1), between(alongX ? zMin + 0.1 : t + 0.05, alongX ? zMax - 0.1 : t + step - 0.05))
    }
  }
}

ringBed(fx, fz, plaza + 0.4, plaza + 2.9, PATH_ANGLES, 520) // 4 bồn quanh quảng trường
ringBed(POND.x, POND.z, POND.radius + 2.5, POND.radius + 3.9, [0, -Math.PI / 2 + 0.3], 240) // quanh lối đi hồ sen
stripBed(-26, 24, FRONT_CURB_Z + 1.0, FRONT_CURB_Z + 1.9, 9, (x) => nearAny(x + 0.6, FRONT_GATES, 1.8)) // sau hàng rào trước
stripBed(LEFT_CURB_X - 1.9, LEFT_CURB_X - 1.0, -26, 4.2, 9, (z) => Math.abs(z + 0.6 - LEFT_GATE_Z) < 1.8) // sau hàng rào hẻm

// ---------------- cây ----------------
export const trunks = [] // { position, height, radius }
export const canopies = [] // { position, scale, color }
export const pines = [] // { position, height, radius, color }

/** Cây tán tròn: thân + 4–6 khối lá; kind = 'green' hoặc loại cây hoa trong BLOSSOM_COLORS. */
function roundTree(x, z, size = 1, kind = 'green') {
  const height = between(2.0, 2.8) * size
  trunks.push({ position: [x, height / 2, z], height, radius: 0.13 * size })
  const colors = kind === 'green' ? LEAF_COLORS : BLOSSOM_COLORS[kind]
  const blobs = 4 + Math.floor(random() * 3)
  for (let i = 0; i < blobs; i++) {
    const angle = (i / blobs) * Math.PI * 2 + between(0, 0.6)
    const spread = between(0.35, 0.8) * size
    const r = between(0.75, 1.1) * size
    canopies.push({
      position: [x + Math.cos(angle) * spread, height + between(0.1, 0.7) * size, z + Math.sin(angle) * spread],
      scale: [r, r * 0.8, r],
      color: pick(colors),
    })
  }
  canopies.push({ position: [x, height + 0.9 * size, z], scale: [0.95 * size, 0.75 * size, 0.95 * size], color: pick(colors) })
}

function pine(x, z, size = 1) {
  const height = between(3.2, 4.6) * size
  trunks.push({ position: [x, 0.4, z], height: 0.8, radius: 0.12 * size })
  pines.push({ position: [x, 0.6 + height / 2, z], height, radius: between(0.9, 1.2) * size, color: pick(['#3f7a46', '#356b3c', '#4a8650']) })
}

/** Rải cây trong vùng chữ nhật, tránh các điểm trong `avoid` ([x, z, bán kính]). */
function scatterTrees(xMin, xMax, zMin, zMax, count, makeTree, avoid = []) {
  const placed = []
  let tries = 0
  while (placed.length < count && tries++ < count * 40) {
    const x = between(xMin, xMax)
    const z = between(zMin, zMax)
    if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue
    if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.2)) continue
    placed.push([x, z])
    makeTree(x, z)
  }
}

const blossom = () => pick(['cherry', 'lagerstroemia', 'flamboyant', 'green', 'green'])

// Vòng cây hoa quanh đài phun nước
for (let i = 0; i < 9; i++) {
  const angle = (i / 9) * Math.PI * 2 + 0.35
  if (PATH_ANGLES.some((a) => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.3)) continue
  roundTree(fx + Math.cos(angle) * 9.5, fz + Math.sin(angle) * 9.5, between(0.95, 1.15), ['cherry', 'lagerstroemia', 'flamboyant'][i % 3])
}
// Anh đào quanh hồ sen
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2 + 0.5
  if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < 0.5) continue // chừa lối vào phía cửa quán
  roundTree(POND.x + Math.cos(angle) * 8.4, POND.z + Math.sin(angle) * 8.4, between(0.9, 1.1), i % 2 ? 'cherry' : 'green')
}

const pathAvoid = [
  [fx, fz, 13],
  [POND.x, POND.z, 10.5],
]
const isOnPath = (x, z) =>
  (Math.abs(x - fx) < 2 && z > fz) || // lối đi sâu vào công viên
  (Math.abs(z - LEFT_GATE_Z) < 2 && x > POND.x) // lối vào vườn hồ sen
scatterTrees(-44, 42, 11, 30, 26, (x, z) => !isOnPath(x, z) && roundTree(x, z, between(0.9, 1.25), blossom()), pathAvoid)
scatterTrees(-44, 42, 32, 46, 22, (x, z) => pine(x, z, between(0.9, 1.3)))
scatterTrees(-42, -11.5, -40, 3, 22, (x, z) => !isOnPath(x, z) && roundTree(x, z, between(0.9, 1.2), blossom()), pathAvoid)
scatterTrees(-46, -30, -44, 4, 10, (x, z) => pine(x, z, between(0.9, 1.3)))
scatterTrees(7.5, 30, -40, 3, 18, (x, z) => (random() < 0.4 ? pine(x, z) : roundTree(x, z, between(0.9, 1.2), blossom())))
scatterTrees(-6, 6, -40, -19, 10, (x, z) => roundTree(x, z, between(0.9, 1.2), blossom()))

// ---------------- đèn công viên, ghế, đá ----------------
export const lamps = [] // { position: [x, 0, z] }
for (let x = -24.5; x <= 22; x += 7) if (!nearAny(x, FRONT_GATES, 1.5)) lamps.push({ position: [x, 0, FRONT_CURB_Z + 0.05] })
for (let z = 1.5; z >= -30; z -= 7) if (Math.abs(z - LEFT_GATE_Z) > 1.5) lamps.push({ position: [LEFT_CURB_X + 0.05, 0, z] })
for (const angle of PATH_ANGLES.slice(0, 4)) {
  lamps.push({ position: [fx + Math.cos(angle + 0.35) * (plaza - 0.35), 0, fz + Math.sin(angle + 0.35) * (plaza - 0.35)] })
}
lamps.push({ position: [POND.x + POND.radius + 1.6, 0, POND.z + 1.4] }, { position: [POND.x - POND.radius - 1.6, 0, POND.z - 1.4] })

export const benches = [] // { position, rotationY }: mặt ghế quay về +z cục bộ → xoay để nhìn vào tâm
for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
  const x = fx + Math.cos(angle) * (plaza - 0.6)
  const z = fz + Math.sin(angle) * (plaza - 0.6)
  benches.push({ position: [x, 0, z], rotationY: Math.atan2(fx - x, fz - z) })
}
for (const angle of [Math.PI * 0.75, Math.PI * 1.25, Math.PI * 0.35]) {
  const x = POND.x + Math.cos(angle) * (POND.radius + 1.5)
  const z = POND.z + Math.sin(angle) * (POND.radius + 1.5)
  benches.push({ position: [x, 0, z], rotationY: Math.atan2(POND.x - x, POND.z - z) })
}

// Đá viền hồ và lá súng, lau sậy
export const rimStones = []
for (let i = 0; i < 46; i++) {
  const angle = (i / 46) * Math.PI * 2
  const r = POND.radius + between(0.05, 0.25)
  rimStones.push({ position: [POND.x + Math.cos(angle) * r, 0.05, POND.z + Math.sin(angle) * r], scale: [between(0.25, 0.4), between(0.14, 0.24), between(0.22, 0.34)], rotationY: between(0, 3) })
}
export const lilyPads = []
for (let i = 0; i < 16; i++) {
  const angle = between(0, Math.PI * 2)
  const r = Math.sqrt(between(0.3, 0.85)) * POND.radius
  lilyPads.push({ position: [POND.x + Math.cos(angle) * r, 0.045, POND.z + Math.sin(angle) * r], scale: between(0.2, 0.34), flower: random() < 0.4 })
}
export const reeds = []
for (let i = 0; i < 40; i++) {
  const angle = between(Math.PI * 0.6, Math.PI * 1.4)
  const r = POND.radius - between(0, 0.5)
  reeds.push({ position: [POND.x + Math.cos(angle) * r + between(-0.2, 0.2), 0, POND.z + Math.sin(angle) * r + between(-0.2, 0.2)], height: between(0.6, 1.1) })
}

// ---------------- xa xa: đồi ----------------
export const hills = []
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * Math.PI * 2 + between(-0.1, 0.1)
  const distance = between(50, 62)
  const width = between(14, 24)
  hills.push({ position: [Math.cos(angle) * distance, -2, -4 + Math.sin(angle) * distance], scale: [width, between(6, 11), width * 0.7], color: pick(['#4f7f52', '#5b8c5a', '#46744c']) })
}

// Đom đóm buổi tối bay trong hai công viên
export const fireflyAreas = [
  { min: [-24, 0.4, 9], max: [22, 2.2, 26] },
  { min: [-30, 0.4, -24], max: [-10, 2.2, 3] },
]

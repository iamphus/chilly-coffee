// Sinh hình cây bằng code: thân thuôn hơi cong chia cành nhiều cấp, tán lá là các tấm lá có texture
// (foliageTexture) với pháp tuyến hướng ra ngoài tán để ánh sáng mềm như một khối lá thật.
// Mỗi cây trả về 2 hình học (gỗ, lá) có vertex color; Trees.jsx vẽ chúng bằng instancing.
import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Quaternion, Vector3 } from 'three'

function seeded(seed) {
  let value = seed % 2147483647 || 1
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

/** Gom đỉnh / tam giác rồi tạo BufferGeometry một lần. */
class MeshData {
  positions = []
  normals = []
  uvs = []
  colors = []
  indices = []
  get count() {
    return this.positions.length / 3
  }
  vertex(position, normal, u, v, color) {
    this.positions.push(position.x, position.y, position.z)
    this.normals.push(normal.x, normal.y, normal.z)
    this.uvs.push(u, v)
    this.colors.push(color.r, color.g, color.b)
  }
  geometry() {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2))
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3))
    geometry.setIndex(this.indices)
    geometry.computeBoundingSphere()
    return geometry
  }
}

// ---------------- thông số từng loài ----------------
// leaves: [màu, tỉ lệ]; blossom: dùng nửa "hoa" của atlas cho màu đó
const SPECIES = {
  broadleaf: {
    trunkHeight: 1.9, trunkRadius: 0.15, lean: 0.12,
    children: [4, 3], spread: [0.75, 0.6], lengthRatio: [0.62, 0.55], upward: 0.35, droop: 0,
    branchLength: 1.7, clusterRadius: 0.78, flatten: 0.85, cards: 11,
    leaves: [['#4f8a3a', 0.4], ['#5f9a45', 0.35], ['#3f7a34', 0.25]],
  },
  flamboyant: {
    // phượng: thân thấp, cành xòe gần ngang, tán dù rộng và dẹt
    trunkHeight: 1.6, trunkRadius: 0.16, lean: 0.1,
    children: [5, 3], spread: [1.15, 0.55], lengthRatio: [0.6, 0.5], upward: 0.12, droop: 0.12,
    branchLength: 2.0, clusterRadius: 0.8, flatten: 0.55, cards: 11,
    leaves: [['#e8553e', 0.4, true], ['#f06a45', 0.25, true], ['#5f9a45', 0.35]],
  },
  cherry: {
    // anh đào: thân ngắn hơi nghiêng, cành vươn chéo, hoa hồng phủ gần kín
    trunkHeight: 1.4, trunkRadius: 0.13, lean: 0.22,
    children: [4, 3], spread: [0.85, 0.65], lengthRatio: [0.65, 0.55], upward: 0.25, droop: 0.05,
    branchLength: 1.6, clusterRadius: 0.8, flatten: 0.8, cards: 15,
    leaves: [['#f8b4cf', 0.5, true], ['#fbc8dc', 0.38, true], ['#6fa04f', 0.12]],
  },
  lagerstroemia: {
    // bằng lăng: dáng bình, cành dựng đứng, chùm hoa tím trên đỉnh
    trunkHeight: 1.7, trunkRadius: 0.12, lean: 0.06,
    children: [4, 3], spread: [0.5, 0.5], lengthRatio: [0.65, 0.55], upward: 0.55, droop: 0,
    branchLength: 1.6, clusterRadius: 0.72, flatten: 0.9, cards: 13,
    leaves: [['#b48fd6', 0.45, true], ['#c4a2e2', 0.3, true], ['#5f9a45', 0.25]],
  },
}

const UP = new Vector3(0, 1, 0)
const tmp = new Vector3()

function anyPerpendicular(direction) {
  return (Math.abs(direction.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).cross(direction).normalize()
}

/** Ống thuôn dọc theo đường cong, có UV để lặp vân vỏ cây. */
function addTube(wood, curve, startRadius, endRadius, sides, rings, color, random) {
  const frames = curve.computeFrenetFrames(rings, false)
  const length = curve.getLength()
  const base = wood.count
  const normal = new Vector3()
  const shade = new Color()
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const point = curve.getPointAt(t)
    const radius = startRadius + (endRadius - startRadius) * t
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2
      normal.copy(frames.normals[i]).multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle))
      shade.copy(color).multiplyScalar(0.85 + random() * 0.2)
      wood.vertex(tmp.copy(point).addScaledVector(normal, radius), normal, j / sides, (t * length) / 0.7, shade)
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = base + i * (sides + 1) + j
      const b = a + sides + 1
      wood.indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
}

/** Một cành (và các cành con) bắt đầu từ `start` theo hướng `direction`; đầu cành cuối cùng thành chùm lá. */
function grow(context, start, direction, length, radius, depth) {
  const { species, random, wood, tips, barkColor } = context
  const side = anyPerpendicular(direction).applyAxisAngle(direction, random() * Math.PI * 2)
  const bend = side.multiplyScalar(length * (0.08 + random() * 0.12))
  const droop = new Vector3(0, -species.droop * length * depth, 0)
  const points = [0, 0.33, 0.66, 1].map((t) => start.clone().addScaledVector(direction, length * t).addScaledVector(bend, Math.sin(t * Math.PI)).addScaledVector(droop, t * t))
  const curve = new CatmullRomCurve3(points)
  const endRadius = radius * (depth === 0 ? 0.55 : 0.4)
  const sides = depth === 0 ? 8 : depth === 1 ? 6 : 4
  addTube(wood, curve, radius, endRadius, sides, depth === 0 ? 5 : 3, barkColor, random)

  if (depth === species.children.length) {
    tips.push({ position: points[3].clone(), size: 1 })
    tips.push({ position: curve.getPointAt(0.55), size: 0.75 }) // thêm lá dọc cành cho tán dày
    return
  }

  const count = species.children[depth]
  for (let k = 0; k < count; k++) {
    const t = k === count - 1 ? 1 : 0.45 + random() * 0.45
    const origin = curve.getPointAt(t)
    const azimuth = (k / count) * Math.PI * 2 + random() * 0.8
    const perpendicular = anyPerpendicular(direction).applyAxisAngle(direction, azimuth)
    const spread = species.spread[depth] * (0.8 + random() * 0.4)
    const childDirection = direction.clone().multiplyScalar(Math.cos(spread)).addScaledVector(perpendicular, Math.sin(spread))
    childDirection.y += species.upward
    childDirection.normalize()
    const childRadius = (radius + (endRadius - radius) * t) * 0.72
    grow(context, origin, childDirection, length * species.lengthRatio[depth] * (0.85 + random() * 0.3), childRadius, depth + 1)
  }
}

const atlasOffset = (blossom) => (blossom ? 0.5 : 0)

function pickColor(palette, random) {
  let roll = random()
  for (const entry of palette) {
    roll -= entry[1]
    if (roll <= 0) return entry
  }
  return palette[palette.length - 1]
}

/** Các tấm lá quanh mỗi đầu cành; pháp tuyến hướng ra ngoài tán, trong tán tối hơn ngoài tán. */
function addFoliage(leaves, tips, species, random) {
  const center = new Vector3()
  tips.forEach((tip) => center.add(tip.position))
  center.divideScalar(tips.length)
  const canopyRadius = Math.max(...tips.map((tip) => tip.position.distanceTo(center))) + species.clusterRadius

  const quaternion = new Quaternion()
  const right = new Vector3()
  const up = new Vector3()
  const normal = new Vector3()
  const corner = new Vector3()
  const color = new Color()

  for (const tip of tips) {
    const radius = species.clusterRadius * tip.size * (0.85 + random() * 0.3)
    for (let c = 0; c < species.cards; c++) {
      const [hex, , blossom] = pickColor(species.leaves, random)
      const cardCenter = new Vector3(random() - 0.5, (random() - 0.5) * species.flatten, random() - 0.5).multiplyScalar(radius * 1.1).add(tip.position)
      const size = radius * (1.15 + random() * 0.35)
      quaternion.setFromAxisAngle(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), random() * Math.PI)
      right.set(1, 0, 0).applyQuaternion(quaternion).multiplyScalar(size / 2)
      up.set(0, 1, 0).applyQuaternion(quaternion).multiplyScalar(size / 2)

      const base = leaves.count
      const offset = atlasOffset(blossom)
      for (const [sx, sy, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
        corner.copy(cardCenter).addScaledVector(right, sx).addScaledVector(up, sy)
        normal.subVectors(corner, center).multiply(tmp.set(1, 1.4, 1)).normalize().lerp(UP, 0.25).normalize()
        const outward = Math.min(1, corner.distanceTo(center) / canopyRadius)
        const height = Math.min(1, Math.max(0, (corner.y - center.y) / canopyRadius + 0.5))
        color.set(hex).multiplyScalar((0.5 + 0.38 * outward + 0.22 * height) * (0.9 + random() * 0.2))
        leaves.vertex(corner, normal, offset + u * 0.5, v, color)
      }
      leaves.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
}

function buildBroadleaf(speciesName, seed) {
  const species = SPECIES[speciesName]
  const random = seeded(seed)
  const wood = new MeshData()
  const tips = []
  const barkColor = new Color('#7a6150')
  const lean = new Vector3((random() - 0.5) * species.lean, 1, (random() - 0.5) * species.lean).normalize()
  const trunkHeight = species.trunkHeight * (0.9 + random() * 0.2)
  const context = { species, random, wood, tips, barkColor }

  // Thân: một cành cấp 0 không chia, rồi các cành chính toả ra từ đỉnh thân
  const trunkCurve = new CatmullRomCurve3([0, 0.35, 0.7, 1].map((t) => new Vector3(Math.sin(t * 3) * 0.05, 0, Math.cos(t * 2) * 0.04).addScaledVector(lean, trunkHeight * t)))
  addTube(wood, trunkCurve, species.trunkRadius, species.trunkRadius * 0.7, 9, 5, barkColor, random)
  // Gốc loe nhẹ
  addTube(wood, new CatmullRomCurve3([new Vector3(0, -0.05, 0), new Vector3(0, 0.15, 0), new Vector3(0, 0.35, 0)]), species.trunkRadius * 1.5, species.trunkRadius, 9, 2, barkColor, random)

  const top = trunkCurve.getPointAt(1)
  const mainCount = species.children[0]
  for (let k = 0; k < mainCount; k++) {
    const azimuth = (k / mainCount) * Math.PI * 2 + random() * 0.6
    const spread = species.spread[0] * (0.8 + random() * 0.4)
    const direction = new Vector3(Math.cos(azimuth) * Math.sin(spread), Math.cos(spread) + species.upward, Math.sin(azimuth) * Math.sin(spread)).normalize()
    const origin = trunkCurve.getPointAt(k === 0 ? 1 : 0.75 + random() * 0.25)
    grow(context, origin, direction, species.branchLength * (0.85 + random() * 0.3), species.trunkRadius * 0.62, 1)
  }
  tips.push({ position: top.clone().add(new Vector3(0, species.branchLength * 0.9, 0)), size: 1.1 }) // đỉnh tán

  const leaves = new MeshData()
  addFoliage(leaves, tips, species, random)
  return { wood: wood.geometry(), leaves: leaves.geometry() }
}

/** Thông: thân thẳng, các tầng lá rủ nhỏ dần lên ngọn. */
function buildPine(seed) {
  const random = seeded(seed)
  const wood = new MeshData()
  const leaves = new MeshData()
  const height = 5 + random() * 1.2
  const barkColor = new Color('#6e5646')
  addTube(wood, new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.03, height * 0.5, 0), new Vector3(0, height, 0)]), 0.16, 0.03, 8, 4, barkColor, random)

  const tiers = 8
  const quaternion = new Quaternion()
  const normal = new Vector3()
  const corner = new Vector3()
  const color = new Color()
  const greens = ['#2f6338', '#3a7042', '#2a5a33']
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const y = height * (0.22 + t * 0.72)
    const radius = 1.5 * (1 - t) + 0.35
    const cards = Math.round(9 - t * 4)
    for (let c = 0; c < cards; c++) {
      const angle = (c / cards) * Math.PI * 2 + random() * 0.5 + i
      const outward = new Vector3(Math.cos(angle), 0, Math.sin(angle))
      // Tấm lá nằm theo hướng cành, rủ xuống ~25°
      quaternion.setFromUnitVectors(new Vector3(0, 0, 1), outward)
      const along = outward.clone().multiplyScalar(radius).add(new Vector3(0, -radius * 0.45, 0))
      const width = new Vector3(1, 0, 0).applyQuaternion(quaternion).multiplyScalar(radius * 0.55)
      const base = leaves.count
      const hex = greens[Math.floor(random() * greens.length)]
      for (const [sx, s, u, v] of [[-1, 0, 0, 0], [1, 0, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
        corner.set(0, y, 0).addScaledVector(width, sx).addScaledVector(along, s)
        normal.copy(outward).multiplyScalar(0.7).add(UP).normalize()
        color.set(hex).multiplyScalar((0.55 + 0.45 * s) * (0.9 + random() * 0.2))
        leaves.vertex(corner, normal, u * 0.5, v, color)
      }
      leaves.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
  return { wood: wood.geometry(), leaves: leaves.geometry() }
}

export const TREE_SPECIES = ['broadleaf', 'flamboyant', 'cherry', 'lagerstroemia', 'pine']
export const VARIANTS_PER_SPECIES = 3

/** Hình học cho mỗi loài × biến thể. Gọi một lần (Trees.jsx dùng useMemo). */
export function buildTreeTemplates() {
  const templates = {}
  TREE_SPECIES.forEach((species, s) => {
    for (let v = 0; v < VARIANTS_PER_SPECIES; v++) {
      const seed = 1000 + s * 97 + v * 13
      templates[`${species}:${v}`] = species === 'pine' ? buildPine(seed) : buildBroadleaf(species, seed)
    }
  })
  return templates
}

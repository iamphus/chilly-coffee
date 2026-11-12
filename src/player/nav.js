// Lưới đi lại của quán (assets/cafe/nav.json, tạo bằng tools/build_nav.py) và tìm đường.
// Chuyển từ bản thử (prototype/demo/index.html): mỗi ô 0,1 m, bit 1 = bị chặn (vật cản đã được nới rộng).
import nav from '../../assets/cafe/nav.json'

const { x0, z0, cell, w: W, h: H } = nav

// Giải mã bit (bit cao trước) thành mảng 0/1
const grid = (() => {
  const raw = atob(nav.data)
  const cells = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) cells[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1
  return cells
})()

const toCell = (x, z) => [Math.floor((z - z0) / cell), Math.floor((x - x0) / cell)]
const toWorld = (r, c) => [x0 + (c + 0.5) * cell, z0 + (r + 0.5) * cell]
const blockedRC = (r, c) => r < 0 || c < 0 || r >= H || c >= W || grid[r * W + c] === 1

/** Ô (x, z) có bị chặn không (ngoài lưới cũng tính là chặn). */
export const isBlocked = (x, z) => blockedRC(...toCell(x, z))

// Khoảng cách (tính bằng ô) tới vật cản gần nhất, để nhân vật đi giữa lối thay vì sát đồ vật
const clearance = (() => {
  const result = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) result[i] = grid[i] ? 0 : 1e9
  const pass = (r0, r1, dr, c0, c1, dc) => {
    for (let r = r0; r !== r1; r += dr) {
      for (let c = c0; c !== c1; c += dc) {
        const k = r * W + c
        let value = result[k]
        if (!value) continue
        for (const [rr, cc, weight] of [
          [r - dr, c, 1],
          [r, c - dc, 1],
          [r - dr, c - dc, 1.414],
          [r - dr, c + dc, 1.414],
        ]) {
          if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue
          value = Math.min(value, result[rr * W + cc] + weight)
        }
        result[k] = value
      }
    }
  }
  pass(0, H, 1, 0, W, 1)
  pass(H - 1, -1, -1, W - 1, -1, -1)
  return result
})()

const clearanceAt = (x, z) => {
  const [r, c] = toCell(x, z)
  return r < 0 || c < 0 || r >= H || c >= W ? 0 : clearance[r * W + c]
}

function nearestFree(r, c) {
  if (!blockedRC(r, c)) return [r, c]
  for (let radius = 1; radius < 10; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue
        if (!blockedRC(r + dr, c + dc)) return [r + dr, c + dc]
      }
    }
  }
  return [r, c]
}

/** Đường thẳng từ a tới b có thông không (và không sát vật cản hơn minClearance). */
function lineOfSight(ax, az, bx, bz, minClearance, endX, endZ) {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.04)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = ax + (bx - ax) * t
    const z = az + (bz - az) * t
    if (isBlocked(x, z)) return false
    const nearEnds = Math.hypot(x - endX, z - endZ) <= 0.7 || Math.hypot(x - ax, z - az) <= 0.35
    if (minClearance && clearanceAt(x, z) < minClearance && !nearEnds) return false
  }
  return true
}

class MinHeap {
  keys = []
  values = []
  get size() {
    return this.keys.length
  }
  push(key, value) {
    const { keys, values } = this
    keys.push(key)
    values.push(value)
    let i = keys.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (values[parent] <= values[i]) break
      ;[keys[parent], keys[i]] = [keys[i], keys[parent]]
      ;[values[parent], values[i]] = [values[i], values[parent]]
      i = parent
    }
  }
  pop() {
    const { keys, values } = this
    const top = [keys[0], values[0]]
    const lastKey = keys.pop()
    const lastValue = values.pop()
    if (keys.length) {
      keys[0] = lastKey
      values[0] = lastValue
      let i = 0
      for (;;) {
        const a = 2 * i + 1
        const b = a + 1
        let m = i
        if (a < keys.length && values[a] < values[m]) m = a
        if (b < keys.length && values[b] < values[m]) m = b
        if (m === i) break
        ;[keys[m], keys[i]] = [keys[i], keys[m]]
        ;[values[m], values[i]] = [values[i], values[m]]
        i = m
      }
    }
    return top
  }
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/**
 * Tìm đường từ (sx, sz) tới (tx, tz): Dijkstra 8 hướng, phạt khi đi sát vật cản,
 * rồi rút gọn bằng các đoạn thẳng nhìn thấy nhau. Trả về [[x, z], …] (không gồm điểm đầu)
 * hoặc null nếu điểm đến cách chỗ đi được gần nhất quá `snap` mét.
 */
export function findPath(sx, sz, tx, tz, snap = 0.6) {
  const [sr, sc] = nearestFree(...toCell(sx, sz))
  const [tr, tc] = toCell(tx, tz)
  const size = W * H
  const dist = new Float64Array(size).fill(1e9)
  const parent = new Int32Array(size).fill(-1)
  const start = sr * W + sc
  const goal = tr * W + tc
  dist[start] = 0
  parent[start] = start

  const heap = new MinHeap()
  heap.push(start, 0)
  let best = start
  let bestDistance = 1e9

  while (heap.size) {
    const [current, d] = heap.pop()
    if (d > dist[current]) continue
    if (current === goal) {
      best = current
      bestDistance = 0
      break
    }
    const r = (current / W) | 0
    const c = current % W
    const toGoal = Math.hypot(r - tr, c - tc)
    if (toGoal < bestDistance) {
      bestDistance = toGoal
      best = current
    }
    for (const [dr, dc] of NEIGHBOURS) {
      const rr = r + dr
      const cc = c + dc
      if (blockedRC(rr, cc)) continue
      if (dr && dc && (blockedRC(r + dr, c) || blockedRC(r, c + dc))) continue // không đi chéo xuyên góc
      const k = rr * W + cc
      const penalty = clearance[k] >= 3.5 ? 0 : (3.5 - clearance[k]) * 0.9
      const next = d + (dr && dc ? 1.414 : 1) * (1 + penalty)
      if (next < dist[k]) {
        dist[k] = next
        parent[k] = current
        heap.push(k, next)
      }
    }
  }
  if (bestDistance > 0 && bestDistance * cell > snap) return null

  const points = []
  for (let k = best; ; k = parent[k]) {
    points.push(toWorld((k / W) | 0, k % W))
    if (k === start) break
  }
  points.reverse()

  // Rút gọn đường nhưng giữ khoảng cách với đồ vật: chỉ nối thẳng khi đoạn đó không sát hơn đường gốc
  const [endX, endZ] = points.at(-1)
  const minClearanceBetween = (from, to) => {
    let min = 1e9
    for (let q = from; q <= to; q++) min = Math.min(min, clearanceAt(...points[q]))
    return min
  }
  const out = [[sx, sz]]
  let i = 0
  while (i < points.length - 1) {
    const [ox, oz] = out.at(-1)
    let j = points.length - 1
    while (j > i + 1 && !lineOfSight(ox, oz, ...points[j], Math.min(3, minClearanceBetween(i, j)), endX, endZ)) j--
    out.push(points[j])
    i = j
  }
  return out.slice(1)
}

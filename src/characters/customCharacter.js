// Dựng mô hình 3D nhân vật chibi động trên trình duyệt từ cấu hình `appearance` (ESM, Three r187+):
// - Gộp mỗi bộ phận (thân, đầu, 2 tay, 2 chân) thành 1 BufferGeometry dùng màu đỉnh → chỉ 6 draw call / người.
// - Giữ nguyên cấu trúc khớp `<nodeId>_Than`, `<nodeId>_Dau`, `<nodeId>_Tay_Trai/Phai`, `<nodeId>_Chan_Trai/Phai`
//   để dùng chung toàn bộ hoạt ảnh và `createActionClips` mà không cần sửa `Player` hay `RemotePlayers`.
// - Có bộ nhớ đệm LRU để nhiều component đọc cùng ngoại hình không dựng lại hình học.
import {
  AnimationClip,
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { encodeAppearance, normalizeAppearance } from './appearance.js'

const CHAR_SCALE = 0.65
const INK = 0x2c211b
const MAX_CACHE = 36

const sharedMaterial = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.62,
  metalness: 0,
  name: 'ChibiCustom',
})

const cache = new Map() // key → { scene, animations }

const parseHex = (str) => Number.parseInt(str, 16)

function shadeHex(hex, factor) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((hex & 0xff) * factor))
  return (r << 16) | (g << 8) | b
}

function createAnimations(id) {
  const q = (x, y = 0, z = 0) => new Quaternion().setFromEuler(new Euler(x, y, z)).toArray()
  const qt = (node, times, eulers) => new QuaternionKeyframeTrack(`${node}.quaternion`, times, eulers.flatMap((e) => q(...e)))
  const pt = (node, times, ys) => new VectorKeyframeTrack(`${node}.position`, times, ys.flatMap((y) => [0, y, 0]))
  const headT = (times, eulers) => qt(`${id}_Dau`, times, eulers)

  const W = 0.9
  const sitLegs = [qt(`${id}_Chan_Trai`, [0], [[-Math.PI / 2, 0, 0]]), qt(`${id}_Chan_Phai`, [0], [[-Math.PI / 2, 0, 0]])]

  return [
    new AnimationClip('Dung', 3, [
      pt(`${id}_Than`, [0, 1.5, 3], [0, 0.012, 0]),
      headT([0, 1.5, 3], [[0, 0, 0], [0.03, 0.15, 0], [0, 0, 0]]),
      qt(`${id}_Tay_Trai`, [0, 1.5, 3], [[0, 0, 0], [0.06, 0, 0], [0, 0, 0]]),
      qt(`${id}_Tay_Phai`, [0, 1.5, 3], [[0, 0, 0], [-0.06, 0, 0], [0, 0, 0]]),
    ]),
    new AnimationClip('Di_Bo', W, [
      qt(`${id}_Chan_Trai`, [0, W / 2, W], [[0.5, 0, 0], [-0.5, 0, 0], [0.5, 0, 0]]),
      qt(`${id}_Chan_Phai`, [0, W / 2, W], [[-0.5, 0, 0], [0.5, 0, 0], [-0.5, 0, 0]]),
      qt(`${id}_Tay_Trai`, [0, W / 2, W], [[-0.45, 0, 0], [0.45, 0, 0], [-0.45, 0, 0]]),
      qt(`${id}_Tay_Phai`, [0, W / 2, W], [[0.45, 0, 0], [-0.45, 0, 0], [0.45, 0, 0]]),
      pt(`${id}_Than`, [0, W / 4, W / 2, (3 * W) / 4, W], [0, 0.04, 0, 0.04, 0]),
      headT([0, W / 2, W], [[0, 0, 0.04], [0, 0, -0.04], [0, 0, 0.04]]),
    ]),
    new AnimationClip('Ngoi_Go_Phim', 0.5, [
      ...sitLegs,
      pt(`${id}_Than`, [0], [0.07]),
      qt(`${id}_Tay_Trai`, [0, 0.25, 0.5], [[-1.62, 0, 0.12], [-1.54, 0, 0.12], [-1.62, 0, 0.12]]),
      qt(`${id}_Tay_Phai`, [0, 0.25, 0.5], [[-1.54, 0, -0.12], [-1.62, 0, -0.12], [-1.54, 0, -0.12]]),
      headT([0, 0.5], [[0.12, 0, 0], [0.12, 0, 0]]),
    ]),
    new AnimationClip('Uong', 5, [
      ...sitLegs,
      pt(`${id}_Than`, [0], [0.07]),
      qt(`${id}_Tay_Trai`, [0, 5], [[-1.5, 0, 0.1], [-1.5, 0, 0.1]]),
      qt(
        `${id}_Tay_Phai`,
        [0, 1.5, 2.2, 3.4, 4.1, 5],
        [[-1.5, 0, -0.1], [-1.5, 0, -0.1], [-2.35, 0, -0.5], [-2.35, 0, -0.5], [-1.5, 0, -0.1], [-1.5, 0, -0.1]],
      ),
      headT([0, 2.2, 3.4, 5], [[0.05, 0, 0], [-0.2, 0, 0], [-0.2, 0, 0], [0.05, 0, 0]]),
    ]),
    new AnimationClip('Vay_Tay', 1.2, [
      qt(`${id}_Tay_Phai`, [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 2.5], [0, 0, 2.9], [0, 0, 2.5], [0, 0, 2.9], [0, 0, 2.5]]),
      headT([0, 0.6, 1.2], [[0, 0, -0.08], [0, 0, 0.04], [0, 0, -0.08]]),
      pt(`${id}_Than`, [0, 0.6, 1.2], [0, 0.015, 0]),
    ]),
    new AnimationClip('Pha_Che', 3.2, [
      qt(`${id}_Tay_Trai`, [0, 1.6, 3.2], [[-0.9, 0, 0.2], [-1.0, 0, 0.25], [-0.9, 0, 0.2]]),
      qt(`${id}_Tay_Phai`, [0, 0.8, 1.6, 2.4, 3.2], [[-0.7, 0, 0], [-1.35, 0, -0.3], [-1.2, 0, -0.5], [-1.35, 0, -0.3], [-0.7, 0, 0]]),
      headT([0, 1.6, 3.2], [[0.25, 0.1, 0], [0.3, -0.1, 0], [0.25, 0.1, 0]]),
      pt(`${id}_Than`, [0, 1.6, 3.2], [0, 0.01, 0]),
    ]),
  ]
}

export const CUSTOM_NODE_ID = 'chibi'
const SHARED_CLIPS = createAnimations(CUSTOM_NODE_ID)

function buildScene(appearance) {
  const id = CUSTOM_NODE_ID
  const root = new Group()
  root.name = id
  const frame = new Group()
  frame.name = `${id}_Khung`
  frame.scale.setScalar(CHAR_SCALE)
  root.add(frame)

  const body = new Group()
  body.name = `${id}_Than`
  frame.add(body)

  const head = new Group()
  head.name = `${id}_Dau`
  head.position.set(0, 0.85, 0)
  body.add(head)

  const mkGroup = (name, parent, x, y, z) => {
    const g = new Group()
    g.name = name
    g.position.set(x, y, z)
    parent.add(g)
    return g
  }

  const armBase = [-1, 1].map((s) => {
    const shoulder = mkGroup(`${id}${s < 0 ? '_Vai_Trai' : '_Vai_Phai'}`, body, s * 0.24, 0.8, 0)
    shoulder.rotation.z = s * 0.14
    return shoulder
  })
  const armL = mkGroup(`${id}_Tay_Trai`, armBase[0], 0, 0, 0)
  const armR = mkGroup(`${id}_Tay_Phai`, armBase[1], 0, 0, 0)
  const legL = mkGroup(`${id}_Chan_Trai`, body, -0.11, 0.4, 0)
  const legR = mkGroup(`${id}_Chan_Phai`, body, 0.11, 0.4, 0)

  const buckets = { body: [], head: [], armL: [], armR: [], legL: [], legR: [] }
  const groups = { body, head, armL, armR, legL, legR }

  const add = (part, geo, hexColor, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const matrix = new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
      new Vector3(sx, sy, sz),
    )
    buckets[part].push({ geo, hexColor, matrix })
  }

  const C = (rt, rb, h, seg = 16, open = false) => new CylinderGeometry(rt, rb, h, seg, 1, open)
  const S = (r, w = 20, h = 14, ts = 0, tl = Math.PI, ps = 0, pl = Math.PI * 2) => new SphereGeometry(r, w, h, ps, pl, ts, tl)
  const Cap = (r, l) => new CapsuleGeometry(r, l, 4, 10)
  const Tor = (r, t, arc = Math.PI * 2) => new TorusGeometry(r, t, 6, 16, arc)
  const Bx = (w, h, d) => new BoxGeometry(w, h, d)
  const fz = (y) => 0.26 - ((y - 0.41) / 0.42) * 0.06 + 0.012

  const sk = parseHex(appearance.skin)
  const top = parseHex(appearance.top)
  const pants = parseHex(appearance.pants)
  const shoe = parseHex(appearance.shoe)
  const hc = parseHex(appearance.hc)
  const shortsMode = appearance.pantsKind === 'shorts'
  const hasHat = appearance.acc.includes('cap') || appearance.acc.includes('beret')

  // Thân & cổ
  add('body', C(0.2, 0.26, 0.42, 20), top, 0, 0.62, 0)
  add('body', C(0.255, 0.24, 0.08, 20), pants, 0, 0.4, 0)
  add('body', C(0.07, 0.08, 0.08, 12), sk, 0, 0.86, 0)

  // Hai chân
  for (const p of ['legL', 'legR']) {
    if (shortsMode) {
      add(p, C(0.105, 0.1, 0.12, 12), pants, 0, -0.05, 0)
      add(p, C(0.075, 0.07, 0.2, 12), sk, 0, -0.2, 0)
    } else {
      add(p, C(0.1, 0.095, 0.3, 12), pants, 0, -0.16, 0)
    }
    add(p, S(0.1, 12, 8), shoe, 0, -0.33, 0.03, 0, 0, 0, 1.1, 0.7, 1.4)
  }

  // Hai tay
  for (const p of ['armL', 'armR']) {
    add(p, Cap(0.075, 0.2), appearance.outfit === 'tee' ? sk : top, 0, -0.15, 0)
    if (appearance.outfit === 'tee') add(p, C(0.085, 0.08, 0.1, 12), top, 0, -0.05, 0)
    add(p, S(0.072, 12, 8), sk, 0, -0.32, 0)
  }

  // Đầu & khuôn mặt
  const HY = 0.35
  add('head', S(0.42, 28, 20), sk, 0, HY, 0, 0, 0, 0, 1, 0.97, 1)
  for (const s of [-1, 1]) {
    add('head', Tor(0.042, 0.011, Math.PI), INK, s * 0.13, HY + 0.015, 0.398, 0, s * 0.32, 0)
    add('head', new CircleGeometry(0.05, 14), 0xf09595, s * 0.2, HY - 0.07, 0.368, 0, s * 0.5, 0)
    add('head', S(0.06, 10, 8), sk, s * 0.41, HY - 0.02, 0, 0, 0, 0, 0.5, 1, 0.8)
  }
  add('head', Tor(0.04, 0.01, Math.PI), INK, 0, HY - 0.09, 0.41, 0, 0, Math.PI)

  // Kiểu tóc
  const crownCap = (th, rx, r = 0.445) => add('head', S(r, 28, 16, 0, th), hc, 0, HY, 0, rx, 0, 0)
  const hairs = {
    short: () => crownCap(1.32, -0.3),
    buzz: () => crownCap(1.18, -0.38, 0.432),
    bun: () => {
      crownCap(1.3, -0.3)
      if (!hasHat) add('head', S(0.17, 14, 10), hc, 0, HY + 0.43, -0.16)
      else add('head', S(0.14, 12, 8), hc, 0, HY + 0.02, -0.44)
    },
    pony: () => {
      crownCap(1.3, -0.3)
      add('head', S(0.06, 10, 8), 0xe24b4a, 0, HY + 0.12, -0.43)
      add('head', Cap(0.085, 0.32), hc, 0, HY - 0.1, -0.5, 0.35, 0, 0)
    },
    curly: () => {
      crownCap(1.2, -0.3, 0.44)
      for (let i = 0; i < 40; i++) {
        const th = 0.15 + (i % 5) * 0.3
        const ph = i * 2.4
        const p = new Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(0.45)
        p.applyAxisAngle(new Vector3(1, 0, 0), -0.3)
        if (p.z > 0.2 && p.y < 0.3) continue
        if (hasHat && p.y > 0.24) continue
        add('head', S(0.115, 8, 6), hc, p.x, p.y + HY, p.z)
      }
    },
    bob: () => {
      add('head', new SphereGeometry(0.455, 28, 16, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, 2.0), hc, 0, HY, 0)
      crownCap(1.22, -0.12, 0.448)
    },
    long: () => {
      add('head', new SphereGeometry(0.452, 28, 16, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, 2.05), hc, 0, HY, 0)
      crownCap(1.24, -0.14, 0.448)
      for (const x of [-0.22, -0.08, 0.08, 0.22]) {
        add('head', Cap(0.095, 0.38), hc, x, HY - 0.26, -0.31, 0.08, 0, 0)
      }
    },
    twin: () => {
      crownCap(1.3, -0.22)
      for (const s of [-1, 1]) {
        add('head', S(0.05, 8, 6), 0xed93b1, s * 0.36, HY - 0.05, -0.12)
        add('head', Cap(0.07, 0.3), hc, s * 0.4, HY - 0.3, -0.14, 0, 0, s * 0.1)
      }
    },
  }
  ;(hairs[appearance.hair] ?? hairs.short)()

  // Trang phục
  const fits = {
    hoodie: () => {
      add('body', Tor(0.19, 0.075), top, 0, 0.86, -0.1, Math.PI / 2 + 0.3)
      add('body', Bx(0.26, 0.1, 0.02), shadeHex(top, 0.8), 0, 0.52, fz(0.52), -0.14)
      for (const x of [-0.05, 0.05]) add('body', C(0.008, 0.008, 0.12, 6), 0xffffff, x, 0.72, fz(0.72))
    },
    cardigan: () => {
      add('body', Bx(0.09, 0.42, 0.02), 0xf8f5ee, 0, 0.62, fz(0.62) - 0.004, -0.14)
      for (const y of [0.5, 0.6, 0.7]) add('body', S(0.016, 8, 6), 0x633806, 0.06, y, fz(y) + 0.004)
    },
    overalls: () => {
      add('body', Bx(0.26, 0.22, 0.03), pants, 0, 0.53, fz(0.53), -0.14)
      for (const x of [-0.09, 0.09]) {
        add('body', Bx(0.045, 0.2, 0.02), pants, x, 0.73, fz(0.73))
        add('body', S(0.018, 8, 6), 0xef9f27, x, 0.64, fz(0.64) + 0.02)
      }
    },
    sweater: () => {
      for (const y of [0.5, 0.62, 0.74]) {
        const r = 0.26 - ((y - 0.41) / 0.42) * 0.06 + 0.006
        add('body', C(r, r + 0.004, 0.045, 20, true), 0xf8f5ee, 0, y, 0)
      }
      add('body', Tor(0.2, 0.065), 0xd85a30, 0, 0.85, 0, Math.PI / 2)
      add('body', Bx(0.09, 0.26, 0.05), 0xd85a30, 0.1, 0.7, 0.24, 0, 0, 0.1)
    },
    shirt: () => {
      for (const s of [-1, 1]) add('body', Bx(0.08, 0.06, 0.02), shadeHex(top, 0.92), s * 0.06, 0.82, fz(0.82), -0.14, 0, s * 0.5)
      for (const y of [0.5, 0.6, 0.7]) add('body', S(0.012, 6, 4), 0x9a9a9a, 0, y, fz(y) + 0.003)
    },
    tee: () => {
      add('body', Tor(0.12, 0.015), shadeHex(top, 0.85), 0, 0.83, 0, Math.PI / 2)
    },
    coat: () => {
      add('body', C(0.27, 0.32, 0.34, 20), top, 0, 0.36, 0)
      add('body', Bx(0.03, 0.62, 0.02), shadeHex(top, 0.75), 0, 0.5, fz(0.5) + 0.02, -0.14)
      add('body', Tor(0.17, 0.05), top, 0, 0.84, 0, Math.PI / 2)
    },
  }
  ;(fits[appearance.outfit] ?? fits.tee)()

  // Phụ kiện
  for (const a of appearance.acc) {
    if (a === 'glasses') {
      for (const s of [-1, 1]) add('head', Tor(0.075, 0.012), 0x1f1a17, s * 0.13, HY + 0.02, 0.41)
      add('head', Bx(0.07, 0.014, 0.014), 0x1f1a17, 0, HY + 0.03, 0.415)
    } else if (a === 'headphones') {
      add('head', Tor(0.44, 0.03, Math.PI), 0x2c2c2a, 0, HY + 0.02, 0)
      for (const s of [-1, 1]) add('head', C(0.1, 0.1, 0.08, 16), 0x2c2c2a, s * 0.43, HY, 0, 0, 0, Math.PI / 2)
    } else if (a === 'cap') {
      add('head', S(0.456, 24, 12, 0, 1.25), 0x2c2c2a, 0, HY, 0, -0.15)
      add('head', C(0.24, 0.24, 0.02, 20), 0x2c2c2a, 0, HY + 0.24, 0.3, 0.25, 0, 0, 1, 1, 0.7)
    } else if (a === 'beret') {
      add('head', S(0.32, 22, 12), 0xa33b3b, 0.07, HY + 0.36, -0.03, 0.08, 0, -0.22, 1.22, 0.44, 1.22)
      add('head', C(0.014, 0.014, 0.05, 8), 0x6b2222, 0.1, HY + 0.49, -0.04, 0, 0, -0.22)
    } else if (a === 'backpack') {
      add('body', new CapsuleGeometry(0.17, 0.12, 4, 10), 0xd85a30, 0, 0.62, -0.3, 0, 0, 0, 1, 1, 0.6)
      for (const s of [-1, 1]) add('body', Bx(0.04, 0.38, 0.02), 0x993c1d, s * 0.11, 0.66, 0)
    } else if (a === 'tie') {
      add('body', Bx(0.05, 0.28, 0.015), 0xa32d2d, 0, 0.66, fz(0.66) + 0.008, -0.14)
    }
  }

  // Gộp mỗi bộ phận thành 1 BufferGeometry duy nhất với màu đỉnh tuyến tính chuẩn Three r187
  const tmpColor = new Color()
  for (const [partName, items] of Object.entries(buckets)) {
    if (!items.length) continue
    const positions = []
    const normals = []
    const colors = []
    const indices = []
    let vertexOffset = 0

    for (const { geo, hexColor, matrix } of items) {
      geo.applyMatrix4(matrix)
      const posAttr = geo.attributes.position
      const normAttr = geo.attributes.normal
      const count = posAttr.count
      tmpColor.setHex(hexColor, SRGBColorSpace)

      for (let i = 0; i < count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
        colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
      }
      if (geo.index) {
        const arr = geo.index.array
        for (let i = 0; i < arr.length; i++) indices.push(arr[i] + vertexOffset)
      } else {
        for (let i = 0; i < count; i++) indices.push(i + vertexOffset)
      }
      vertexOffset += count
      geo.dispose()
    }

    const merged = new BufferGeometry()
    merged.setAttribute('position', new Float32BufferAttribute(positions, 3))
    merged.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    merged.setAttribute('color', new Float32BufferAttribute(colors, 3))
    merged.setIndex(indices)

    const partGroup = groups[partName]
    const mesh = new Mesh(merged, sharedMaterial)
    mesh.name = `${partGroup.name}_Khoi`
    mesh.castShadow = true
    partGroup.add(mesh)
  }

  return root
}

/**
 * Lấy mô hình `{ scene, animations, nodeId }` cho ngoại hình `rawAppearance` (có cache LRU).
 * Component gọi `scene.clone(true)` giống hệt như khi dùng `useGLTF`.
 */
export function getCustomCharacter(rawAppearance, fallbackCharacterId) {
  const appearance = normalizeAppearance(rawAppearance, fallbackCharacterId)
  const key = encodeAppearance(appearance)
  if (cache.has(key)) {
    const hit = cache.get(key)
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }

  const entry = {
    scene: buildScene(appearance),
    animations: SHARED_CLIPS,
    nodeId: CUSTOM_NODE_ID,
  }
  cache.set(key, entry)

  if (cache.size > MAX_CACHE) {
    const oldestKey = cache.keys().next().value
    const oldest = cache.get(oldestKey)
    cache.delete(oldestKey)
    oldest?.scene.traverse((obj) => {
      if (obj.isMesh) obj.geometry.dispose()
    })
  }

  return entry
}

// Plugin Vite nén hình học trong mọi file .glb khi chạy `vite build` bằng EXT_meshopt_compression:
// - Giữ nguyên file gốc trong `assets/` để `tools/build_nav.py` (Python trimesh) và `prototype/` không bị hỏng.
// - Sắp xếp lại đỉnh + chỉ số tam giác (`reorderMesh`) để tăng tốc cache GPU, hạ uint32 → uint16 khi < 65535 đỉnh.
// - Dùng bộ lọc EXPONENTIAL cho thuộc tính FLOAT nên sau khi giải mã ở trình duyệt (MeshoptDecoder có sẵn trong
//   three-stdlib, không tải WASM từ CDN ngoài), dữ liệu trả về đúng Float32Array chuẩn cho three-mesh-bvh / raycast.
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const EXTENSION = 'EXT_meshopt_compression'
const GLB_MAGIC = 0x46546c67
const CHUNK_JSON = 0x4e4f534a
const CHUNK_BIN = 0x004e4942

const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }
const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }

const pad4 = (n) => (n + 3) & ~3

/** Nén một Buffer .glb bằng EXT_meshopt_compression. Không phải GLB hợp lệ hoặc đã nén rồi thì trả nguyên bản. */
export async function compressGlb(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input)
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== GLB_MAGIC) return bytes

  const jsonLen = bytes.readUInt32LE(12)
  if (bytes.readUInt32LE(16) !== CHUNK_JSON) return bytes
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLen).toString('utf8'))
  if (json.extensionsUsed?.includes(EXTENSION)) return bytes

  const binHeader = 20 + jsonLen
  if (binHeader + 8 > bytes.length || bytes.readUInt32LE(binHeader + 4) !== CHUNK_BIN) return bytes
  const binLen = bytes.readUInt32LE(binHeader)
  const bin = new Uint8Array(bytes.buffer, bytes.byteOffset + binHeader + 8, binLen)

  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])

  // Đếm số nơi tham chiếu từng bufferView để chỉ reorder những mesh không dùng chung bufferView với nơi khác
  const bvRefCount = new Map()
  const addRef = (bv) => {
    if (bv != null) bvRefCount.set(bv, (bvRefCount.get(bv) ?? 0) + 1)
  }

  const nonMeshViews = new Set()
  for (const image of json.images ?? []) {
    if (image.bufferView != null) {
      nonMeshViews.add(image.bufferView)
      addRef(image.bufferView)
    }
  }
  for (const anim of json.animations ?? []) {
    for (const sampler of anim.samplers ?? []) {
      for (const accIdx of [sampler.input, sampler.output]) {
        const bv = json.accessors?.[accIdx]?.bufferView
        if (bv != null) {
          nonMeshViews.add(bv)
          addRef(bv)
        }
      }
    }
  }
  for (const skin of json.skins ?? []) {
    const bv = json.accessors?.[skin.inverseBindMatrices]?.bufferView
    if (bv != null) {
      nonMeshViews.add(bv)
      addRef(bv)
    }
  }

  const targets = new Map() // bufferViewIndex → { kind: 'attr' | 'index', semantic, accessors[] }
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      for (const accIdx of Object.values(prim.attributes ?? {})) addRef(json.accessors?.[accIdx]?.bufferView)
      if (prim.indices != null) addRef(json.accessors?.[prim.indices]?.bufferView)

      if (prim.mode != null && prim.mode !== 4) continue
      for (const [semantic, accIdx] of Object.entries(prim.attributes ?? {})) {
        const acc = json.accessors[accIdx]
        if (acc?.bufferView == null || nonMeshViews.has(acc.bufferView) || (acc.byteOffset ?? 0) !== 0) continue
        const existing = targets.get(acc.bufferView)
        if (!existing) targets.set(acc.bufferView, { kind: 'attr', semantic, accessors: [accIdx] })
        else existing.accessors.push(accIdx)
      }
      if (prim.indices != null) {
        const acc = json.accessors[prim.indices]
        if (acc?.bufferView != null && !nonMeshViews.has(acc.bufferView) && (acc.byteOffset ?? 0) === 0 && acc.count % 3 === 0) {
          const existing = targets.get(acc.bufferView)
          if (!existing) targets.set(acc.bufferView, { kind: 'index', semantic: 'INDICES', accessors: [prim.indices] })
          else existing.accessors.push(prim.indices)
        }
      }
    }
  }

  if (!targets.size) return bytes

  const bufferViews = json.bufferViews ?? []
  const customSlices = new Map() // bufferViewIndex → Uint8Array đã reorder / ép kiểu

  const readView = (bvIdx) => {
    if (customSlices.has(bvIdx)) return customSlices.get(bvIdx)
    const bv = bufferViews[bvIdx]
    return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
  }

  // Reorder đỉnh + tam giác cho các primitive độc lập (không có morph target) để nén chặt hơn ~30–50%
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      if ((prim.mode != null && prim.mode !== 4) || prim.indices == null || prim.targets?.length) continue
      const idxAcc = json.accessors[prim.indices]
      const attrEntries = Object.values(prim.attributes ?? {}).map((ai) => json.accessors[ai])
      if (!idxAcc || idxAcc.bufferView == null || idxAcc.count % 3 !== 0) continue
      if (bvRefCount.get(idxAcc.bufferView) !== 1) continue
      if (![5121, 5123, 5125].includes(idxAcc.componentType)) continue
      if (attrEntries.some((a) => !a || a.bufferView == null || (a.byteOffset ?? 0) !== 0 || bvRefCount.get(a.bufferView) !== 1)) {
        continue
      }
      const vertexCount = attrEntries[0]?.count ?? 0
      if (!vertexCount || attrEntries.some((a) => a.count !== vertexCount)) continue

      const rawIdx = readView(idxAcc.bufferView)
      const idx32 = new Uint32Array(idxAcc.count)
      if (idxAcc.componentType === 5125) {
        const tmp = new Uint32Array(idxAcc.count)
        Buffer.from(rawIdx.buffer, rawIdx.byteOffset, rawIdx.byteLength).copy(Buffer.from(tmp.buffer))
        idx32.set(tmp)
      } else if (idxAcc.componentType === 5123) {
        const tmp = new Uint16Array(idxAcc.count)
        Buffer.from(rawIdx.buffer, rawIdx.byteOffset, rawIdx.byteLength).copy(Buffer.from(tmp.buffer))
        for (let k = 0; k < idxAcc.count; k++) idx32[k] = tmp[k]
      } else {
        for (let k = 0; k < idxAcc.count; k++) idx32[k] = rawIdx[k]
      }

      const [remap, unique] = MeshoptEncoder.reorderMesh(idx32, true, true)
      if (unique > vertexCount) continue

      for (const acc of attrEntries) {
        const bv = bufferViews[acc.bufferView]
        const stride = bv.byteStride ?? TYPE_COMPONENTS[acc.type] * COMPONENT_BYTES[acc.componentType]
        const src = readView(acc.bufferView)
        const dst = new Uint8Array(unique * stride)
        for (let v = 0; v < vertexCount; v++) {
          const to = remap[v]
          if (to < unique) dst.set(src.subarray(v * stride, (v + 1) * stride), to * stride)
        }
        customSlices.set(acc.bufferView, dst)
        acc.count = unique
        bv.byteLength = dst.byteLength
      }

      const idxBv = bufferViews[idxAcc.bufferView]
      if (unique <= 65535) {
        const idx16 = new Uint16Array(idx32.length)
        for (let k = 0; k < idx32.length; k++) idx16[k] = idx32[k]
        const bytes16 = new Uint8Array(idx16.buffer)
        customSlices.set(idxAcc.bufferView, bytes16)
        idxAcc.componentType = 5123
        idxBv.byteLength = bytes16.byteLength
      } else {
        const bytes32 = new Uint8Array(idx32.buffer)
        customSlices.set(idxAcc.bufferView, bytes32)
        idxAcc.componentType = 5125
        idxBv.byteLength = bytes32.byteLength
      }
    }
  }

  const chunks = []
  let cursor = 0
  let fallbackBytes = 0
  let compressedCount = 0

  const appendChunk = (data) => {
    const offset = cursor
    const padded = pad4(data.byteLength)
    chunks.push(data)
    if (padded > data.byteLength) chunks.push(new Uint8Array(padded - data.byteLength))
    cursor += padded
    return offset
  }

  for (let i = 0; i < bufferViews.length; i++) {
    const bv = bufferViews[i]
    const raw = readView(i)
    const target = targets.get(i)

    if (!target) {
      bv.byteOffset = appendChunk(raw)
      bv.buffer = 0
      continue
    }

    const acc = json.accessors[target.accessors[0]]
    const comps = TYPE_COMPONENTS[acc.type]
    const compSize = COMPONENT_BYTES[acc.componentType]
    const stride = bv.byteStride ?? comps * compSize
    const count = acc.count

    const validAttr = target.kind === 'attr' && stride >= 4 && stride <= 256 && stride % 4 === 0 && count * stride === bv.byteLength
    const validIndex = target.kind === 'index' && (stride === 2 || stride === 4) && count * stride === bv.byteLength

    if (!validAttr && !validIndex) {
      bv.byteOffset = appendChunk(raw)
      bv.buffer = 0
      continue
    }

    let sourceBytes
    let mode = 'ATTRIBUTES'
    let filter

    if (validIndex) {
      mode = 'TRIANGLES'
      sourceBytes = new Uint8Array(raw)
    } else if (acc.componentType === 5126) {
      const aligned = new Float32Array(count * (stride / 4))
      Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).copy(Buffer.from(aligned.buffer))
      const bits = target.semantic === 'POSITION' ? 15 : target.semantic === 'NORMAL' ? 9 : 13
      const expMode = target.semantic === 'POSITION' ? 'SharedVector' : 'Separate'
      sourceBytes = MeshoptEncoder.encodeFilterExp(aligned, count, stride, bits, expMode)
      filter = 'EXPONENTIAL'
    } else {
      sourceBytes = new Uint8Array(raw)
    }

    const encoded = MeshoptEncoder.encodeGltfBuffer(sourceBytes, count, stride, mode)
    if (encoded.byteLength >= raw.byteLength) {
      bv.byteOffset = appendChunk(raw)
      bv.buffer = 0
      continue
    }

    if (filter === 'EXPONENTIAL' && target.semantic === 'POSITION') {
      const decoded = new Uint8Array(count * stride)
      MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode, filter)
      const floats = new Float32Array(decoded.buffer)
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (let v = 0; v < count; v++) {
        for (let k = 0; k < 3; k++) {
          const val = floats[v * 3 + k]
          if (val < min[k]) min[k] = val
          if (val > max[k]) max[k] = val
        }
      }
      for (const accIdx of target.accessors) {
        if (json.accessors[accIdx].min) json.accessors[accIdx].min = min
        if (json.accessors[accIdx].max) json.accessors[accIdx].max = max
      }
    }

    const compOffset = appendChunk(encoded)
    const fallbackOffset = fallbackBytes
    fallbackBytes += pad4(bv.byteLength)
    compressedCount += 1

    bv.buffer = 1
    bv.byteOffset = fallbackOffset
    bv.extensions = {
      ...bv.extensions,
      [EXTENSION]: {
        buffer: 0,
        byteOffset: compOffset,
        byteLength: encoded.byteLength,
        byteStride: stride,
        count,
        mode,
        ...(filter ? { filter } : {}),
      },
    }
  }

  if (!compressedCount) return bytes

  json.buffers = [
    { byteLength: cursor },
    { byteLength: fallbackBytes, extensions: { [EXTENSION]: { fallback: true } } },
  ]
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), EXTENSION])]
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), EXTENSION])]

  const jsonRaw = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonPad = pad4(jsonRaw.length) - jsonRaw.length
  const jsonChunk = jsonPad ? Buffer.concat([jsonRaw, Buffer.alloc(jsonPad, 0x20)]) : jsonRaw
  const binChunk = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)))

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length
  const out = Buffer.allocUnsafe(totalLength)
  out.writeUInt32LE(GLB_MAGIC, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(totalLength, 8)
  out.writeUInt32LE(jsonChunk.length, 12)
  out.writeUInt32LE(CHUNK_JSON, 16)
  jsonChunk.copy(out, 20)
  const binPos = 20 + jsonChunk.length
  out.writeUInt32LE(binChunk.length, binPos)
  out.writeUInt32LE(CHUNK_BIN, binPos + 4)
  binChunk.copy(out, binPos + 8)
  return out
}

/** Plugin Vite: nén mọi asset .glb xuất ra trong bundle sản phẩm (`vite build`). */
export function glbMeshoptPlugin() {
  return {
    name: 'chilly-glb-meshopt',
    apply: 'build',
    async generateBundle(_, bundle) {
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type !== 'asset' || !fileName.endsWith('.glb')) continue
        const before = item.source.byteLength
        const compressed = await compressGlb(item.source)
        item.source = new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength)
        const savedPct = Math.round((1 - compressed.byteLength / before) * 100)
        this.info(`${fileName}: ${(before / 1024).toFixed(1)} kB → ${(compressed.byteLength / 1024).toFixed(1)} kB (−${savedPct}%)`)
      }
    },
  }
}

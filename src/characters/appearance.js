// Cấu hình ngoại hình nhân vật chibi (tóc, trang phục, màu sắc, phụ kiện) + mã hoá ngắn (~36 ký tự)
// để lưu localStorage và truyền qua Supabase Presence mà không tốn băng thông.
import { DEFAULT_CHARACTER, PLAYABLE_CHARACTERS } from './playableCharacters.js'

export const HAIR_STYLES = ['short', 'bob', 'long', 'bun', 'pony', 'twin', 'curly', 'buzz']
export const OUTFIT_STYLES = ['hoodie', 'cardigan', 'overalls', 'sweater', 'shirt', 'tee', 'coat']
export const PANTS_KINDS = ['long', 'shorts']
export const ACCESSORY_ITEMS = ['glasses', 'headphones', 'cap', 'beret', 'backpack', 'tie']

export const SKIN_PALETTE = ['f3c9a4', 'f0be96', 'e8b08a', 'd9a27a', 'ba825c', '8d5b3e']
export const HAIR_PALETTE = ['1f1a17', '2c211b', '4a2c1e', '6b3e26', 'b5693a', 'd9a45b', '8c3b4a', '5b6d92']
export const TOP_PALETTE = [
  '5dcaa5',
  'f5c4b3',
  'fac775',
  'afa9ec',
  'ed93b1',
  '378add',
  'd85a30',
  '97c459',
  'f8f5ee',
  'e26d5c',
  '4f6d7a',
  '2c2c2a',
]
export const PANTS_PALETTE = ['444441', '2c2c2a', '2c2c3a', '185fa5', '85b7eb', '5f5e5a', '3c3489', 'c9b296']
export const SHOE_PALETTE = ['f1efe8', 'ffffff', '2c2c2a', '5f5e5a', 'e24b4a', '7a4a2a']

// Ngoại hình gốc của 10 nhân vật dựng sẵn (khớp 1-1 với CHAR_PRESETS trong characters.js)
export const PRESET_APPEARANCES = {
  guest_headphones: {
    base: 'guest_headphones',
    hair: 'twin',
    hc: '2a1c16',
    outfit: 'tee',
    top: 'ed93b1',
    pantsKind: 'long',
    pants: '3c3489',
    shoe: 'ffffff',
    skin: 'f3c9a4',
    acc: ['headphones'],
  },
  guest_hoodie: {
    base: 'guest_hoodie',
    hair: 'short',
    hc: '2c211b',
    outfit: 'hoodie',
    top: '5dcaa5',
    pantsKind: 'long',
    pants: '444441',
    shoe: 'f1efe8',
    skin: 'f0be96',
    acc: [],
  },
  guest_cardigan: {
    base: 'guest_cardigan',
    hair: 'bun',
    hc: '1f1a17',
    outfit: 'cardigan',
    top: 'f5c4b3',
    pantsKind: 'long',
    pants: '85b7eb',
    shoe: 'f1efe8',
    skin: 'f3c9a4',
    acc: [],
  },
  guest_overalls: {
    base: 'guest_overalls',
    hair: 'pony',
    hc: '6b3e26',
    outfit: 'overalls',
    top: 'fac775',
    pantsKind: 'long',
    pants: '185fa5',
    shoe: 'e24b4a',
    skin: 'e8b08a',
    acc: [],
  },
  guest_sweater: {
    base: 'guest_sweater',
    hair: 'bob',
    hc: '4a2c1e',
    outfit: 'sweater',
    top: 'afa9ec',
    pantsKind: 'long',
    pants: '5f5e5a',
    shoe: 'f1efe8',
    skin: 'f0be96',
    acc: [],
  },
  guest_glasses: {
    base: 'guest_glasses',
    hair: 'curly',
    hc: '3b2a20',
    outfit: 'shirt',
    top: 'f8f5ee',
    pantsKind: 'long',
    pants: '2c2c2a',
    shoe: '5f5e5a',
    skin: 'd9a27a',
    acc: ['glasses'],
  },
  passerby_backpack: {
    base: 'passerby_backpack',
    hair: 'short',
    hc: '2c211b',
    outfit: 'tee',
    top: '378add',
    pantsKind: 'long',
    pants: '444441',
    shoe: 'f1efe8',
    skin: 'e8b08a',
    acc: ['backpack'],
  },
  passerby_office: {
    base: 'passerby_office',
    hair: 'buzz',
    hc: '1f1a17',
    outfit: 'shirt',
    top: 'ffffff',
    pantsKind: 'long',
    pants: '2c2c3a',
    shoe: '1f1a17',
    skin: 'd9a27a',
    acc: ['tie'],
  },
  passerby_umbrella: {
    base: 'passerby_umbrella',
    hair: 'bob',
    hc: '1f1a17',
    outfit: 'coat',
    top: 'd85a30',
    pantsKind: 'long',
    pants: '444441',
    shoe: '5f5e5a',
    skin: 'f3c9a4',
    acc: [],
  },
  passerby_jogger: {
    base: 'passerby_jogger',
    hair: 'short',
    hc: '4a2c1e',
    outfit: 'tee',
    top: '97c459',
    pantsKind: 'shorts',
    pants: '2c2c2a',
    shoe: 'e24b4a',
    skin: 'd9a27a',
    acc: ['cap'],
  },
}

const HEX_RE = /^[0-9a-f]{6}$/i
const cleanHex = (value, fallback) => {
  const s = String(value ?? '').replace(/^#/, '').toLowerCase()
  return HEX_RE.test(s) ? s : fallback
}
const pickAllowed = (value, list, fallback) => (list.includes(value) ? value : fallback)

// Mũ lưỡi trai và mũ nồi cùng đội trên đỉnh đầu nên chỉ giữ tối đa 1 chiếc mũ
function normalizeAccessories(list) {
  if (!Array.isArray(list)) return []
  const unique = []
  let hasHat = false
  for (const item of list) {
    if (!ACCESSORY_ITEMS.includes(item) || unique.includes(item)) continue
    if (item === 'cap' || item === 'beret') {
      if (hasHat) continue
      hasHat = true
    }
    unique.push(item)
  }
  return unique.sort((a, b) => ACCESSORY_ITEMS.indexOf(a) - ACCESSORY_ITEMS.indexOf(b))
}

export function presetAppearance(characterId = DEFAULT_CHARACTER) {
  const preset = PRESET_APPEARANCES[characterId] ?? PRESET_APPEARANCES[DEFAULT_CHARACTER]
  return { ...preset, acc: [...preset.acc] }
}

/** Chuẩn hoá một object ngoại hình bất kỳ (kể cả dữ liệu nhận từ mạng) về dạng an toàn. */
export function normalizeAppearance(raw, fallbackCharacterId = DEFAULT_CHARACTER) {
  const fallback = presetAppearance(fallbackCharacterId)
  if (!raw || typeof raw !== 'object') return fallback
  const base = pickAllowed(raw.base, PLAYABLE_CHARACTERS, fallback.base)
  return {
    base,
    hair: pickAllowed(raw.hair, HAIR_STYLES, fallback.hair),
    hc: cleanHex(raw.hc, fallback.hc),
    outfit: pickAllowed(raw.outfit, OUTFIT_STYLES, fallback.outfit),
    top: cleanHex(raw.top, fallback.top),
    pantsKind: pickAllowed(raw.pantsKind, PANTS_KINDS, fallback.pantsKind),
    pants: cleanHex(raw.pants, fallback.pants),
    shoe: cleanHex(raw.shoe, fallback.shoe),
    skin: cleanHex(raw.skin, fallback.skin),
    acc: normalizeAccessories(raw.acc ?? fallback.acc),
  }
}

/** Kiểm tra xem ngoại hình này có khớp y hệt nhân vật dựng sẵn `base` không. */
export function isPresetAppearance(appearance) {
  const norm = normalizeAppearance(appearance, appearance?.base)
  const preset = PRESET_APPEARANCES[norm.base]
  if (!preset) return false
  return (
    norm.hair === preset.hair &&
    norm.hc === preset.hc &&
    norm.outfit === preset.outfit &&
    norm.top === preset.top &&
    norm.pantsKind === preset.pantsKind &&
    norm.pants === preset.pants &&
    norm.shoe === preset.shoe &&
    norm.skin === preset.skin &&
    norm.acc.join(',') === preset.acc.join(',')
  )
}

/** Nếu người chơi giữ nguyên mẫu gốc thì ẩn NPC trùng mẫu đó; đã tự phối đồ khác đi thì giữ nguyên NPC. */
export function excludedNpcIds(appearance) {
  return isPresetAppearance(appearance) ? [appearance.base] : []
}

const ACC_SHORT = { glasses: 'g', headphones: 'h', cap: 'c', beret: 'r', backpack: 'b', tie: 't' }
const SHORT_TO_ACC = Object.fromEntries(Object.entries(ACC_SHORT).map(([k, v]) => [v, k]))

/** Đóng gói ngoại hình thành chuỗi gọn (~38 ký tự) để làm khoá cache và gửi qua mạng. */
export function encodeAppearance(appearance) {
  const a = normalizeAppearance(appearance, appearance?.base)
  const accCode = a.acc.map((item) => ACC_SHORT[item] ?? '').join('') || '-'
  const pk = a.pantsKind === 'shorts' ? 's' : 'l'
  return `${a.hair}.${a.hc}.${a.outfit}.${a.top}.${pk}.${a.pants}.${a.shoe}.${a.skin}.${accCode}`
}

/** Giải mã chuỗi `encodeAppearance` về object ngoại hình an toàn. */
export function decodeAppearance(code, fallbackCharacterId = DEFAULT_CHARACTER) {
  if (typeof code !== 'string' || code.length > 80) return presetAppearance(fallbackCharacterId)
  const parts = code.split('.')
  if (parts.length !== 9) return presetAppearance(fallbackCharacterId)
  const [hair, hc, outfit, top, pk, pants, shoe, skin, accRaw] = parts
  const acc = accRaw === '-' ? [] : [...accRaw].map((ch) => SHORT_TO_ACC[ch]).filter(Boolean)
  return normalizeAppearance(
    {
      base: fallbackCharacterId,
      hair,
      hc,
      outfit,
      top,
      pantsKind: pk === 's' ? 'shorts' : 'long',
      pants,
      shoe,
      skin,
      acc,
    },
    fallbackCharacterId,
  )
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** Sinh một bộ trang phục phối ngẫu nhiên hài hoà. */
export function randomAppearance(base = DEFAULT_CHARACTER) {
  const acc = []
  if (Math.random() < 0.35) acc.push('glasses')
  const hatRoll = Math.random()
  if (hatRoll < 0.2) acc.push('cap')
  else if (hatRoll < 0.38) acc.push('beret')
  else if (hatRoll < 0.52) acc.push('headphones')
  if (Math.random() < 0.28) acc.push('backpack')
  const outfit = pickRandom(OUTFIT_STYLES)
  if (outfit === 'shirt' && Math.random() < 0.4) acc.push('tie')

  return normalizeAppearance({
    base,
    hair: pickRandom(HAIR_STYLES),
    hc: pickRandom(HAIR_PALETTE),
    outfit,
    top: pickRandom(TOP_PALETTE),
    pantsKind: Math.random() < 0.22 ? 'shorts' : 'long',
    pants: pickRandom(PANTS_PALETTE),
    shoe: pickRandom(SHOE_PALETTE),
    skin: pickRandom(SKIN_PALETTE),
    acc,
  })
}

import { create } from 'zustand'
import { decodeAppearance, encodeAppearance, normalizeAppearance, presetAppearance } from './characters/appearance.js'
import { DEFAULT_CHARACTER, PLAYABLE_CHARACTERS } from './characters/playableCharacters.js'
import { cleanMessage } from './net/chatFilter.js'
import { randomNickname } from './player/nicknames.js'

/** Chế độ camera: 'free' = xoay tự do (mặc định), 'locked' = khóa sau lưng */
export const CAMERA_MODES = ['locked', 'free']
export const MAX_NICKNAME_LENGTH = 24
const CAMERA_MODE_KEY = 'chilly.cameraMode'
const CHARACTER_KEY = 'chilly.character'
const APPEARANCE_KEY = 'chilly.appearance'
const NICKNAME_KEY = 'chilly.nickname'
const LITE_KEY = 'chilly.lite'
const TIME_KEY = 'chilly.timeOfDay'
const SOUND_KEY = 'chilly.sound'
const RAIN_KEY = 'chilly.rain'
export const TIME_OPTIONS = ['auto', 'day', 'sunset', 'night']

// localStorage có thể bị chặn (chế độ ẩn danh…): đọc lỗi thì dùng mặc định, ghi lỗi thì bỏ qua
function load(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return allowed.includes(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // không lưu được thì lần sau dùng mặc định
  }
}

/** Trả về '' nếu tên không dùng được (rỗng, hoặc sau khi che từ tục chỉ còn '**' / ký hiệu) để gán tên ngẫu nhiên. */
function sanitizeNickname(raw) {
  const cleaned = cleanMessage(raw).slice(0, MAX_NICKNAME_LENGTH).trim()
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : ''
}

function loadNickname() {
  try {
    const saved = sanitizeNickname(localStorage.getItem(NICKNAME_KEY))
    if (saved) return saved
  } catch {
    // dùng tên ngẫu nhiên mới
  }
  const nickname = randomNickname()
  save(NICKNAME_KEY, nickname)
  return nickname
}

const SOUND_DEFAULTS = { muted: false, musicOn: true, musicVolume: 0.8, ambienceVolume: 0.8 }

function loadSound() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOUND_KEY))
    return { ...SOUND_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) }
  } catch {
    return SOUND_DEFAULTS
  }
}

function saveSound(state) {
  save(SOUND_KEY, JSON.stringify({ muted: state.muted, musicOn: state.musicOn, musicVolume: state.musicVolume, ambienceVolume: state.ambienceVolume }))
}

const toast = (key, params = {}) => ({ toast: { key, params, id: Date.now() } })

function loadAppearance(characterId) {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY)
    if (raw) return decodeAppearance(raw, characterId)
  } catch {
    // dùng ngoại hình gốc của mẫu nhân vật
  }
  return presetAppearance(characterId)
}

const initialCharacterId = load(CHARACTER_KEY, PLAYABLE_CHARACTERS, DEFAULT_CHARACTER)

/**
 * Trạng thái chung của quán, dùng chung giữa cảnh 3D, giao diện laptop và âm thanh.
 * Các tính năng sau (chọn bàn, tai nghe…) đọc và ghi qua đây thay vì truyền props qua nhiều tầng.
 */
export const useCafeStore = create((set, get) => ({
  choosing: false, // đã bấm "Vào quán" ở landing → đang ở màn chọn nhân vật
  entered: false, // đã chọn xong nhân vật → bắt đầu dựng cảnh 3D
  loadProgress: 0, // % tải mô hình 3D (0–100)
  sceneReady: false, // cảnh 3D đã dựng xong, landing có thể ẩn đi
  characterId: initialCharacterId, // mẫu nhân vật nền
  appearance: loadAppearance(initialCharacterId), // ngoại hình chi tiết (tóc, đồ, màu, phụ kiện)
  cameraMode: load(CAMERA_MODE_KEY, CAMERA_MODES, 'free'),
  nickname: loadNickname(), // tên trên bảng tên
  toast: null, // { key, params, id }: thông báo nhỏ ở giữa phía trên, tự ẩn
  nearbySeat: null, // bàn trống gần nhân vật (để hiện nút "Ngồi xuống")
  seat: null, // tên bàn đang ngồi, ví dụ 'Ban_07'; null = đang đi lại
  laptopOpen: false, // đang ngồi và đã mở laptop (góc nhìn vào màn hình)
  action: null, // hành động đang chạy ở thanh hành động: 'wave' | 'drink' | 'stretch' | 'yawn'
  changingCharacter: false, // đang mở màn đổi nhân vật trong quán
  lite: load(LITE_KEY, ['1', '0'], '0') === '1', // chế độ nhẹ: tắt bóng, độ phân giải 1×
  timeOfDay: load(TIME_KEY, TIME_OPTIONS, 'auto'),
  rain: load(RAIN_KEY, ['1', '0'], '0') === '1', // trời mưa (hạt mưa + tiếng mưa)
  headphones: false, // đeo tai nghe: nhạc quán tắt, tạp âm nhỏ và trầm, nhạc riêng (YouTube) trên laptop phát
  // Âm thanh (src/audio/): tắt tiếng, bật/tắt nhạc quán, âm lượng nhạc / tạp âm phố (0–1)
  ...loadSound(),
  inside: false, // nhân vật đang ở trong quán (Player cập nhật) → nhạc to, tạp âm phố nhỏ
  nowPlaying: null, // bài nhạc quán đang phát { index, title?, artist? }

  openCharacterSelect: () => set({ choosing: true }),
  finishChoosing: () => set({ choosing: false }), // màn chọn nhân vật lúc vào quán đã mờ hẳn
  setAppearance: (rawAppearance) => {
    const appearance = normalizeAppearance(rawAppearance, rawAppearance?.base ?? get().characterId)
    save(CHARACTER_KEY, appearance.base)
    save(APPEARANCE_KEY, encodeAppearance(appearance))
    set({ characterId: appearance.base, appearance })
  },
  enterCafe: (characterId, rawAppearance) => {
    const appearance = normalizeAppearance(rawAppearance ?? presetAppearance(characterId), characterId)
    save(CHARACTER_KEY, appearance.base)
    save(APPEARANCE_KEY, encodeAppearance(appearance))
    set({ characterId: appearance.base, appearance, entered: true })
  },
  setNickname: (raw) => {
    const nickname = sanitizeNickname(raw) || randomNickname()
    save(NICKNAME_KEY, nickname)
    set({ nickname })
    return nickname
  },
  randomizeNickname: () => {
    const current = get().nickname
    let nickname = randomNickname()
    for (let tries = 0; tries < 5 && nickname === current; tries++) nickname = randomNickname()
    save(NICKNAME_KEY, nickname)
    set({ nickname })
    return nickname
  },
  toggleCameraMode: () => {
    const cameraMode = get().cameraMode === 'locked' ? 'free' : 'locked'
    save(CAMERA_MODE_KEY, cameraMode)
    set({ cameraMode, ...toast('game.camera.toast', { mode: cameraMode }) })
  },
  showToast: (key, params) => set(toast(key, params)),
  sitDown: (seat) => set({ seat, seatAt: Date.now(), laptopOpen: false, nearbySeat: null, action: null }),
  standUp: () => {
    // Đang mở laptop nghe tai nghe mà đứng dậy → trình phát YouTube đóng nên tự tháo tai nghe để nghe lại nhạc quán
    const takeOff = get().laptopOpen && get().headphones
    set({
      seat: null,
      seatAt: null,
      laptopOpen: false,
      ...(takeOff ? { headphones: false, ...toast('game.headphones.off') } : {}),
    })
  },
  openLaptop: () => set((state) => (state.seat ? { laptopOpen: true } : {})),
  closeLaptop: () => {
    const takeOff = get().laptopOpen && get().headphones
    set({
      laptopOpen: false,
      ...(takeOff ? { headphones: false, ...toast('game.headphones.off') } : {}),
    })
  },
  toggleAction: (action) => set((state) => ({ action: state.action === action ? null : action })),
  openCharacterChange: () => set({ changingCharacter: true, action: null }),
  closeCharacterChange: () => set({ changingCharacter: false }),
  changeCharacter: (characterId, rawAppearance) => {
    const appearance = normalizeAppearance(rawAppearance ?? presetAppearance(characterId), characterId)
    save(CHARACTER_KEY, appearance.base)
    save(APPEARANCE_KEY, encodeAppearance(appearance))
    set({ characterId: appearance.base, appearance, changingCharacter: false })
  },
  setLite: (lite) => {
    save(LITE_KEY, lite ? '1' : '0')
    set({ lite })
  },
  toggleRain: () => {
    const rain = !get().rain
    save(RAIN_KEY, rain ? '1' : '0')
    set({ rain, ...toast(rain ? 'game.rain.on' : 'game.rain.off') })
  },
  setSound: (changes) => {
    set(changes)
    saveSound(get())
  },
  setTimeOfDay: (timeOfDay) => {
    save(TIME_KEY, timeOfDay)
    set({ timeOfDay })
  },
  setHeadphones: (headphones) => {
    if (get().headphones === headphones) return
    set({ headphones, ...toast(headphones ? 'game.headphones.on' : 'game.headphones.off') })
  },
  toggleHeadphones: () => get().setHeadphones(!get().headphones),
}))

import { create } from 'zustand'
import { DEFAULT_CHARACTER, PLAYABLE_CHARACTERS } from './characters/playableCharacters.js'
import { randomNickname } from './player/nicknames.js'

/** Chế độ camera: 'locked' = khóa sau lưng (mặc định), 'free' = xoay tự do */
export const CAMERA_MODES = ['locked', 'free']
const CAMERA_MODE_KEY = 'chilly.cameraMode'
const CHARACTER_KEY = 'chilly.character'
const NICKNAME_KEY = 'chilly.nickname'
const LITE_KEY = 'chilly.lite'
const TIME_KEY = 'chilly.timeOfDay'
export const TIME_OPTIONS = ['auto', 'day', 'night']

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

function loadNickname() {
  try {
    const saved = localStorage.getItem(NICKNAME_KEY)
    if (saved) return saved
  } catch {
    // dùng tên ngẫu nhiên mới
  }
  const nickname = randomNickname()
  save(NICKNAME_KEY, nickname)
  return nickname
}

const toast = (key, params = {}) => ({ toast: { key, params, id: Date.now() } })

/**
 * Trạng thái chung của quán, dùng chung giữa cảnh 3D, giao diện laptop và âm thanh.
 * Các tính năng sau (chọn bàn, tai nghe…) đọc và ghi qua đây thay vì truyền props qua nhiều tầng.
 */
export const useCafeStore = create((set, get) => ({
  choosing: false, // đã bấm "Vào quán" ở landing → đang ở màn chọn nhân vật
  entered: false, // đã chọn xong nhân vật → bắt đầu dựng cảnh 3D
  loadProgress: 0, // % tải mô hình 3D (0–100)
  sceneReady: false, // cảnh 3D đã dựng xong, landing có thể ẩn đi
  characterId: load(CHARACTER_KEY, PLAYABLE_CHARACTERS, DEFAULT_CHARACTER), // nhân vật người chơi
  cameraMode: load(CAMERA_MODE_KEY, CAMERA_MODES, 'locked'),
  nickname: loadNickname(), // tên trên bảng tên
  toast: null, // { key, params, id }: thông báo nhỏ ở giữa phía trên, tự ẩn
  nearbySeat: null, // bàn trống gần nhân vật (để hiện nút "Ngồi xuống")
  seat: null, // tên bàn đang ngồi, ví dụ 'Ban_07'; null = đang đi lại
  action: null, // hành động đang chạy ở thanh hành động: 'wave' | 'drink' | 'stretch' | 'yawn'
  changingCharacter: false, // đang mở màn đổi nhân vật trong quán
  lite: load(LITE_KEY, ['1', '0'], '0') === '1', // chế độ nhẹ: tắt bóng, độ phân giải 1×
  timeOfDay: load(TIME_KEY, TIME_OPTIONS, 'auto'),
  headphones: false,

  openCharacterSelect: () => set({ choosing: true }),
  finishChoosing: () => set({ choosing: false }), // màn chọn nhân vật lúc vào quán đã mờ hẳn
  enterCafe: (characterId) => {
    save(CHARACTER_KEY, characterId)
    set({ characterId, entered: true })
  },
  toggleCameraMode: () => {
    const cameraMode = get().cameraMode === 'locked' ? 'free' : 'locked'
    save(CAMERA_MODE_KEY, cameraMode)
    set({ cameraMode, ...toast('game.camera.toast', { mode: cameraMode }) })
  },
  showToast: (key, params) => set(toast(key, params)),
  sitDown: (seat) => set({ seat, nearbySeat: null, action: null }),
  standUp: () => set({ seat: null }),
  toggleAction: (action) => set((state) => ({ action: state.action === action ? null : action })),
  openCharacterChange: () => set({ changingCharacter: true, action: null }),
  closeCharacterChange: () => set({ changingCharacter: false }),
  changeCharacter: (characterId) => {
    save(CHARACTER_KEY, characterId)
    set({ characterId, changingCharacter: false })
  },
  setLite: (lite) => {
    save(LITE_KEY, lite ? '1' : '0')
    set({ lite })
  },
  setTimeOfDay: (timeOfDay) => {
    save(TIME_KEY, timeOfDay)
    set({ timeOfDay })
  },
  toggleHeadphones: () => set((state) => ({ headphones: !state.headphones })),
}))

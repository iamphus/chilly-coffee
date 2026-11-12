import { create } from 'zustand'
import { DEFAULT_CHARACTER, PLAYABLE_CHARACTERS } from './characters/playableCharacters.js'

/** Chế độ camera: 'locked' = khóa sau lưng (mặc định), 'free' = xoay tự do */
export const CAMERA_MODES = ['locked', 'free']
const CAMERA_MODE_KEY = 'chilly.cameraMode'
const CHARACTER_KEY = 'chilly.character'

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
  toast: null, // { key, params, id }: thông báo nhỏ ở giữa phía trên, tự ẩn
  seat: null, // tên bàn đang ngồi, ví dụ 'Ban_07'; null = đang đi lại
  headphones: false,

  openCharacterSelect: () => set({ choosing: true }),
  enterCafe: (characterId) => {
    save(CHARACTER_KEY, characterId)
    set({ characterId, entered: true })
  },
  toggleCameraMode: () => {
    const cameraMode = get().cameraMode === 'locked' ? 'free' : 'locked'
    save(CAMERA_MODE_KEY, cameraMode)
    set({ cameraMode, toast: { key: 'game.camera.toast', params: { mode: cameraMode }, id: Date.now() } })
  },
  sitDown: (seat) => set({ seat }),
  standUp: () => set({ seat: null }),
  toggleHeadphones: () => set((state) => ({ headphones: !state.headphones })),
}))

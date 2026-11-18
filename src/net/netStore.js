import { create } from 'zustand'
import { readRoomFromUrl, sanitizeRoomCode, writeRoomToUrl } from './roomCode.js'

// Trạng thái nhiều người: ai đang trong phòng, tin nhắn chat, người bị chặn.
// Vị trí từng khung hình của người khác (peerMotion), bong bóng chat và vị trí bảng tên (tagAnchors)
// thay đổi liên tục nên để ngoài React, trong các Map ở cuối file.

const BLOCKED_KEY = 'chilly.blocked'
const MAX_BLOCKED = 100

function sessionId() {
  try {
    const saved = sessionStorage.getItem('chilly.peerId')
    if (saved) return saved
    const id = crypto.randomUUID()
    sessionStorage.setItem('chilly.peerId', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function loadBlocked() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BLOCKED_KEY))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).slice(-MAX_BLOCKED))
  } catch {
    return {}
  }
}

function saveBlocked(blocked) {
  try {
    const entries = Object.entries(blocked).slice(-MAX_BLOCKED)
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // không lưu được thì giữ trong phiên hiện tại
  }
}

const MAX_MESSAGES = 60

export const useNetStore = create((set) => ({
  selfId: sessionId(),
  kind: null, // 'supabase' | 'local'
  requestedRoom: readRoomFromUrl(), // null = tự chọn phòng công khai còn chỗ; chuỗi = vào đúng phòng đó
  room: null,
  connected: false,
  peers: {}, // id → { name, character, seat, sitAt, laptopOpen, action, headphones, status, pomodoros, x, z, yaw }
  messages: [], // { key, from, name, text, at, self }
  blocked: loadBlocked(), // id → tên (lưu localStorage để F5 không mất)
  chatOpen: false,

  setPeers: (peers) => set({ peers }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message].slice(-MAX_MESSAGES) })),
  block: (id, name) =>
    set((state) => {
      bubbles.delete(id)
      const blocked = { ...state.blocked, [id]: name }
      saveBlocked(blocked)
      return { blocked, messages: state.messages.filter((m) => m.from !== id) }
    }),
  unblockAll: () => {
    saveBlocked({})
    set({ blocked: {} })
  },
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setRequestedRoom: (raw) => {
    const next = raw ? sanitizeRoomCode(raw) : null
    writeRoomToUrl(next)
    set({ requestedRoom: next, messages: [] })
  },
}))

/** id → { x, y, z, yaw, moving }: vị trí mới nhất nhận được của người khác (nội suy trong RemotePlayer). */
export const peerMotion = new Map()

/** id → { text, until }: bong bóng chat trên đầu (cả mình, id = selfId). */
export const bubbles = new Map()
export const BUBBLE_MS = 6000

/** id → { x, y, visible }: vị trí bảng tên người khác trên màn hình (px). */
export const tagAnchors = new Map()

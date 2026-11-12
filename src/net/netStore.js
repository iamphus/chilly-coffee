import { create } from 'zustand'

// Trạng thái nhiều người: ai đang trong phòng, tin nhắn chat, người bị chặn.
// Vị trí từng khung hình của người khác (peerMotion), bong bóng chat và vị trí bảng tên (tagAnchors)
// thay đổi liên tục nên để ngoài React, trong các Map ở cuối file.

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

const MAX_MESSAGES = 60

export const useNetStore = create((set) => ({
  selfId: sessionId(),
  kind: null, // 'supabase' | 'local'
  room: null,
  connected: false,
  peers: {}, // id → { name, character, seat, sitAt, laptopOpen, action, status, pomodoros, x, z, yaw }
  messages: [], // { key, from, name, text, at, self }
  blocked: {}, // id → tên (chặn trong phiên này)
  chatOpen: false,

  setPeers: (peers) => set({ peers }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message].slice(-MAX_MESSAGES) })),
  block: (id, name) =>
    set((state) => ({ blocked: { ...state.blocked, [id]: name }, messages: state.messages.filter((m) => m.from !== id) })),
  unblockAll: () => set({ blocked: {} }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
}))

/** id → { x, y, z, yaw, moving }: vị trí mới nhất nhận được của người khác (nội suy trong RemotePlayer). */
export const peerMotion = new Map()

/** id → { text, until }: bong bóng chat trên đầu (cả mình, id = selfId). */
export const bubbles = new Map()
export const BUBBLE_MS = 6000

/** id → { x, y, visible }: vị trí bảng tên người khác trên màn hình (px). */
export const tagAnchors = new Map()

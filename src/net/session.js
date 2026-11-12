// Phiên kết nối nhiều người: chọn Supabase (nếu có khoá trong .env.local) hoặc kênh giữa các tab,
// đẩy trạng thái của mình lên, nhận người khác về netStore, gửi / nhận chat.
import { remainingMs, useFocusStore } from '../focus/focusStore.js'
import { useCafeStore } from '../store.js'
import { cleanMessage, createRateLimiter } from './chatFilter.js'
import { BUBBLE_MS, bubbles, peerMotion, useNetStore } from './netStore.js'
import { createLocalTransport } from './transport/localTransport.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const LOCAL_ROOM = '02'

let transport = null
let lastState = ''
const limiter = createRateLimiter()

/** Trạng thái công khai của mình (gửi cho người khác). position: vị trí làm tròn để không gửi liên tục. */
export function selfState(position) {
  const cafe = useCafeStore.getState()
  const focus = useFocusStore.getState()
  return {
    name: cafe.nickname,
    character: cafe.characterId,
    seat: cafe.seat,
    sitAt: cafe.seatAt ?? null,
    laptopOpen: cafe.laptopOpen,
    action: cafe.action,
    status: focus.running && remainingMs(focus) > 0 ? focus.mode : 'idle', // 'focus' | 'break' | 'idle'
    pomodoros: focus.completedToday,
    x: position ? Math.round(position.x * 10) / 10 : 0,
    z: position ? Math.round(position.z * 10) / 10 : 0,
    yaw: position ? Math.round(position.yaw * 10) / 10 : 0,
  }
}

/** Gửi trạng thái nếu có thay đổi. */
export function publishState(position) {
  if (!transport) return
  const state = selfState(position)
  const serialized = JSON.stringify(state)
  if (serialized === lastState) return
  lastState = serialized
  transport.updateState(state)
}

export function sendMove(move) {
  transport?.sendMove(move)
}

/** Gửi chat. Trả về lý do không gửi được ('empty' | 'tooFast' | 'offline') hoặc null nếu đã gửi. */
export function sendChat(raw) {
  const text = cleanMessage(raw)
  if (!text) return 'empty'
  if (!transport) return 'offline'
  if (!limiter.allow()) return 'tooFast'
  const net = useNetStore.getState()
  const at = Date.now()
  transport.sendChat({ text, at })
  net.addMessage({ key: `${net.selfId}-${at}`, from: net.selfId, name: useCafeStore.getState().nickname, text, at, self: true })
  bubbles.set(net.selfId, { text, until: at + BUBBLE_MS })
  return null
}

/** Ghế mình đang ngồi bị người khác ngồi trước (2 người bấm cùng lúc): mình đứng dậy. */
function resolveSeatConflict(peers) {
  const cafe = useCafeStore.getState()
  if (!cafe.seat) return
  const mine = cafe.seatAt ?? 0
  const earlier = Object.values(peers).some((peer) => peer.seat === cafe.seat && (peer.sitAt ?? 0) < mine)
  if (earlier) {
    cafe.standUp()
    cafe.showToast('net.seatTaken')
  }
}

export async function startSession(initialPosition) {
  const net = useNetStore.getState()
  const options = { room: LOCAL_ROOM, selfId: net.selfId, initialState: selfState(initialPosition) }
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createSupabaseTransport } = await import('./transport/supabaseTransport.js')
    transport = createSupabaseTransport({ ...options, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })
  } else {
    transport = createLocalTransport(options)
  }
  lastState = JSON.stringify(options.initialState)
  useNetStore.setState({ kind: transport.kind })

  transport.connect({
    onStatus: ({ connected, room }) => useNetStore.setState({ connected, room }),
    onPeers: (peers) => {
      // Người mới vào: đặt vị trí ban đầu từ trạng thái; người rời: xoá
      for (const [id, peer] of Object.entries(peers)) {
        if (!peerMotion.has(id)) peerMotion.set(id, { x: peer.x, y: 0, z: peer.z, yaw: peer.yaw, moving: false })
      }
      for (const id of [...peerMotion.keys()]) if (!peers[id]) peerMotion.delete(id)
      useNetStore.getState().setPeers(peers)
      resolveSeatConflict(peers)
    },
    onMove: (id, move) => {
      if (move && Number.isFinite(move.x) && Number.isFinite(move.z)) peerMotion.set(id, move)
    },
    onChat: (id, message) => {
      const state = useNetStore.getState()
      if (state.blocked[id]) return
      const text = cleanMessage(message?.text) // lọc cả phía nhận (không tin người gửi)
      if (!text) return
      const name = state.peers[id]?.name ?? '…'
      const at = Date.now()
      state.addMessage({ key: `${id}-${message.at ?? at}`, from: id, name, text, at, self: false })
      bubbles.set(id, { text, until: at + BUBBLE_MS })
    },
  })
}

export function stopSession() {
  transport?.disconnect()
  transport = null
  peerMotion.clear()
  bubbles.clear()
  useNetStore.setState({ peers: {}, connected: false, room: null })
}

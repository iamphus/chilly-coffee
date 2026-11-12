// Kết nối qua Supabase Realtime: Presence (ai đang trong phòng + trạng thái) và Broadcast (vị trí, chat).
// Không lưu gì vào cơ sở dữ liệu. Phòng đầy (MAX_PER_ROOM) thì tự chuyển sang phòng kế tiếp.
import { createClient } from '@supabase/supabase-js'

export const MAX_PER_ROOM = 20
const ROOMS = ['02', '03', '04', '05', '06']
const PRESENCE_MIN_GAP_MS = 1000 // Supabase giới hạn tần suất cập nhật presence

export function createSupabaseTransport({ url, anonKey, selfId, initialState }) {
  const client = createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 12 } } })
  let channel = null
  let state = initialState
  let handlers = {}
  let room = null
  let lastTrack = 0
  let pendingTrack = null

  const peersFrom = (presence) => {
    const peers = {}
    for (const [id, metas] of Object.entries(presence)) {
      if (id !== selfId && metas.length) peers[id] = metas[metas.length - 1]
    }
    return peers
  }

  const track = () => {
    if (!channel) return
    const wait = PRESENCE_MIN_GAP_MS - (Date.now() - lastTrack)
    if (wait > 0) {
      clearTimeout(pendingTrack)
      pendingTrack = setTimeout(track, wait)
      return
    }
    lastTrack = Date.now()
    channel.track(state)
  }

  function join(index) {
    room = ROOMS[index]
    let checkedCapacity = false
    channel = client.channel(`chilly-room-${room}`, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const peers = peersFrom(channel.presenceState())
        // Lần đồng bộ đầu: phòng đã đủ người thì sang phòng sau
        if (!checkedCapacity) {
          checkedCapacity = true
          if (Object.keys(peers).length >= MAX_PER_ROOM && index < ROOMS.length - 1) {
            client.removeChannel(channel)
            join(index + 1)
            return
          }
          handlers.onStatus?.({ connected: true, room })
        }
        handlers.onPeers?.(peers)
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => handlers.onMove?.(payload.id, payload.move))
      .on('broadcast', { event: 'chat' }, ({ payload }) => handlers.onChat?.(payload.id, payload.message))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') track()
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onStatus?.({ connected: false, room, error: status })
      })
  }

  return {
    kind: 'supabase',
    get room() {
      return room
    },
    connect(nextHandlers) {
      handlers = nextHandlers
      join(0)
    },
    updateState(next) {
      state = next
      track()
    },
    sendMove(move) {
      channel?.send({ type: 'broadcast', event: 'move', payload: { id: selfId, move } })
    },
    sendChat(message) {
      channel?.send({ type: 'broadcast', event: 'chat', payload: { id: selfId, message } })
    },
    disconnect() {
      clearTimeout(pendingTrack)
      if (channel) client.removeChannel(channel)
      channel = null
    },
  }
}

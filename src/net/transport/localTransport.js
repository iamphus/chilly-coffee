// Kết nối giữa các tab cùng trình duyệt (BroadcastChannel): để thử nhiều người trên một máy khi chưa có Supabase.
// Cùng giao diện với supabaseTransport.js:
//   connect({ onPeers, onMove, onChat, onStatus }) · updateState(state) · sendMove(move) · sendChat(text) · disconnect()
const HEARTBEAT_MS = 2000
const TIMEOUT_MS = 6500

export function createLocalTransport({ room, selfId, initialState }) {
  const channel = new BroadcastChannel(`chilly:${room}`)
  const peers = new Map() // id → { state, seenAt }
  let state = initialState
  let handlers = {}
  let heartbeat = null

  const emitPeers = () => handlers.onPeers?.(Object.fromEntries([...peers].map(([id, peer]) => [id, peer.state])))
  const post = (message) => channel.postMessage({ ...message, id: selfId })

  channel.onmessage = ({ data }) => {
    if (!data || data.id === selfId) return
    if (data.type === 'state') {
      const isNew = !peers.has(data.id)
      peers.set(data.id, { state: data.state, seenAt: Date.now() })
      emitPeers()
      if (isNew) post({ type: 'state', state }) // chào lại để người mới thấy mình ngay
    } else if (data.type === 'bye') {
      peers.delete(data.id)
      emitPeers()
    } else if (data.type === 'move') {
      handlers.onMove?.(data.id, data.move)
    } else if (data.type === 'chat') {
      handlers.onChat?.(data.id, data.message)
    }
  }

  const sayBye = () => post({ type: 'bye' })

  return {
    kind: 'local',
    room,
    connect(nextHandlers) {
      handlers = nextHandlers
      post({ type: 'state', state })
      heartbeat = setInterval(() => {
        post({ type: 'state', state })
        const now = Date.now()
        let changed = false
        for (const [id, peer] of peers) {
          if (now - peer.seenAt > TIMEOUT_MS) {
            peers.delete(id)
            changed = true
          }
        }
        if (changed) emitPeers()
      }, HEARTBEAT_MS)
      window.addEventListener('pagehide', sayBye)
      handlers.onStatus?.({ connected: true, room })
    },
    updateState(next) {
      state = next
      post({ type: 'state', state })
    },
    sendMove(move) {
      post({ type: 'move', move })
    },
    sendChat(message) {
      post({ type: 'chat', message })
    },
    disconnect() {
      clearInterval(heartbeat)
      sayBye()
      window.removeEventListener('pagehide', sayBye)
      channel.close()
    },
  }
}

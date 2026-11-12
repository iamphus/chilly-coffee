import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFocusStore } from '../focus/focusStore.js'
import { useCafeStore } from '../store.js'
import { publishState, sendMove, startSession, stopSession } from './session.js'

const MOVE_INTERVAL = 1 / 8 // giây: gửi vị trí tối đa 8 lần/giây khi đang đi
const STATE_INTERVAL = 1.5 // giây: cập nhật vị trí đứng yên trong trạng thái (cho người mới vào thấy đúng chỗ)
const MIN_STEP = 0.03 // m

/**
 * Nằm trong cảnh 3D (cần vị trí nhân vật): mở phiên nhiều người, gửi vị trí khi di chuyển,
 * gửi trạng thái (ngồi, laptop, Pomodoro, hành động…) khi thay đổi.
 */
export default function NetworkSync({ gameRef }) {
  const last = useRef({ x: 0, z: 0, yaw: 0, moving: false, sentAt: 0, stateAt: 0 })

  useEffect(() => {
    const position = () => {
      const { position: p, yaw } = gameRef.current
      return { x: p.x, z: p.z, yaw }
    }
    startSession(position())
    const unsubscribeCafe = useCafeStore.subscribe(() => publishState(position()))
    const unsubscribeFocus = useFocusStore.subscribe(() => publishState(position()))
    return () => {
      unsubscribeCafe()
      unsubscribeFocus()
      stopSession()
    }
  }, [gameRef])

  useFrame(({ clock }) => {
    const state = gameRef.current
    const sent = last.current
    const now = clock.elapsedTime
    const { x, y, z } = state.position
    const changed =
      Math.hypot(x - sent.x, z - sent.z) > MIN_STEP || Math.abs(state.yaw - sent.yaw) > 0.05 || state.moving !== sent.moving
    if (changed && now - sent.sentAt >= MOVE_INTERVAL) {
      sendMove({ x, y, z, yaw: state.yaw, moving: state.moving })
      Object.assign(sent, { x, z, yaw: state.yaw, moving: state.moving, sentAt: now })
    }
    if (now - sent.stateAt >= STATE_INTERVAL) {
      sent.stateAt = now
      publishState({ x, z, yaw: state.yaw })
    }
  })

  return null
}

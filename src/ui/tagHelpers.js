import { useEffect, useRef } from 'react'
import { bubbles, useNetStore } from '../net/netStore.js'

/** Dòng trạng thái dưới tên: đang tập trung / nghỉ giải lao, số Pomodoro hôm nay. */
export function statusText(t, peer) {
  const parts = []
  if (peer.status === 'focus') parts.push(t('net.status.focus'))
  else if (peer.status === 'break') parts.push(t('net.status.break'))
  if (peer.pomodoros > 0) parts.push(t('net.status.pomodoros', { count: peer.pomodoros }))
  return parts.join(' · ')
}

/** Đặt một thẻ DOM theo vị trí màn hình mỗi khung hình; hiện / ẩn bong bóng chat theo thời gian. */
export function useFollowAnchor(getAnchor, id) {
  const tag = useRef(null)
  const bubble = useRef(null)
  useEffect(() => {
    let frame = 0
    const follow = () => {
      const element = tag.current
      const anchor = getAnchor()
      if (element && anchor) {
        element.style.opacity = anchor.visible ? '1' : '0'
        element.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -100%)`
      }
      const said = bubbles.get(id)
      const blocked = useNetStore.getState().blocked[id]
      if (bubble.current) {
        const show = said && said.until > Date.now() && !blocked
        bubble.current.hidden = !show
        if (show && bubble.current.textContent !== said.text) bubble.current.textContent = said.text
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [getAnchor, id])
  return { tag, bubble }
}

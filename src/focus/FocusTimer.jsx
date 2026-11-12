import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCafeStore } from '../store.js'
import { remainingMs, useFocusStore } from './focusStore.js'
import { formatTime } from './format.js'
import { notify } from './notifications.js'

const TICK_MS = 500

/**
 * Chạy ngầm khi đang ở trong quán (kể cả lúc đứng dậy đi lại): hết giờ thì chuyển lượt,
 * báo trong quán và báo trình duyệt; hiện giờ còn lại trên tiêu đề tab.
 */
export default function FocusTimer() {
  const { t } = useTranslation()

  useEffect(() => {
    const baseTitle = document.title
    const tick = () => {
      const focus = useFocusStore.getState()
      if (focus.running && Date.now() >= focus.endsAt) {
        const finished = focus.complete()
        const key = finished === 'focus' ? 'laptop.pomodoro.focusDone' : 'laptop.pomodoro.breakDone'
        useCafeStore.getState().showToast(key)
        notify(t(key))
      }
      const now = useFocusStore.getState()
      document.title = now.running ? `${formatTime(remainingMs(now))} · ${baseTitle}` : baseTitle
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    return () => {
      clearInterval(id)
      document.title = baseTitle
    }
  }, [t])

  return null
}

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { remainingMs, useFocusStore } from '../focus/focusStore.js'
import { useNetStore } from '../net/netStore.js'
import { nameTagAnchor } from '../player/nameTagAnchor.js'
import { useCafeStore } from '../store.js'
import { statusText, useFollowAnchor } from './tagHelpers.js'

/** Bảng tên trên đầu nhân vật người chơi: chấm "Tôi" + tên + trạng thái, bong bóng khi mình chat. */
export default function NameTag() {
  const { t } = useTranslation()
  const nickname = useCafeStore((state) => state.nickname)
  const selfId = useNetStore((state) => state.selfId)
  const focus = useFocusStore()
  const getAnchor = useCallback(() => nameTagAnchor, [])
  const { tag, bubble } = useFollowAnchor(getAnchor, selfId)
  const status = statusText(t, {
    status: focus.running && remainingMs(focus) > 0 ? focus.mode : 'idle',
    pomodoros: focus.completedToday,
  })

  return (
    <div ref={tag} className="peer-tag" aria-hidden="true">
      <p ref={bubble} className="chat-bubble chat-bubble--self" hidden />
      <div className="name-tag">
        <span className="name-tag__me">{t('game.me')}</span>
        <span>
          {nickname}
          {status && <small>{status}</small>}
        </span>
      </div>
    </div>
  )
}

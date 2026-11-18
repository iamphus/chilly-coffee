import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNetStore } from '../net/netStore.js'
import { buildInviteUrl, generatePrivateRoom, isPrivateRoom, PUBLIC_ROOMS, sanitizeRoomCode } from '../net/roomCode.js'
import { useCafeStore } from '../store.js'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Bảng quản lý phòng (bấm vào tên phòng ở góc trên trái):
 * sao chép link mời bạn bè vào đúng phòng đang ngồi, tạo phòng riêng cho nhóm, hoặc nhập mã phòng.
 */
export default function RoomPopover({ onClose }) {
  const { t } = useTranslation()
  const room = useNetStore((state) => state.room)
  const requestedRoom = useNetStore((state) => state.requestedRoom)
  const setRequestedRoom = useNetStore((state) => state.setRequestedRoom)
  const showToast = useCafeStore((state) => state.showToast)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  const panelRef = useRef(null)

  const activeRoom = room ?? requestedRoom ?? PUBLIC_ROOMS[0]
  const isPrivate = isPrivateRoom(activeRoom)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    const onPointer = (event) => panelRef.current && !panelRef.current.parentElement.contains(event.target) && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [onClose])

  const copyInvite = async (targetRoom = activeRoom) => {
    const ok = await copyText(buildInviteUrl(targetRoom))
    showToast(ok ? 'net.roomMenu.copied' : 'net.roomMenu.copyFailed', { room: targetRoom })
  }

  const createPrivate = async () => {
    const code = generatePrivateRoom()
    setRequestedRoom(code)
    const ok = await copyText(buildInviteUrl(code))
    showToast(ok ? 'net.roomMenu.createdCopied' : 'net.roomMenu.created', { room: code })
    onClose()
  }

  const submitJoin = (event) => {
    event.preventDefault()
    const code = sanitizeRoomCode(draft)
    if (!code) {
      setInvalid(true)
      return
    }
    setRequestedRoom(code)
    showToast('net.roomMenu.joined', { room: code })
    onClose()
  }

  const backToPublic = () => {
    setRequestedRoom(null)
    showToast('net.roomMenu.backPublic')
    onClose()
  }

  return (
    <div ref={panelRef} className="hud-popover hud-popover--left room-menu" role="dialog" aria-label={t('net.roomMenu.title')}>
      <div className="room-menu__current">
        <span>{isPrivate ? t('net.roomMenu.privateBadge') : t('net.roomMenu.publicBadge')}</span>
        <strong>{activeRoom}</strong>
      </div>

      <p className="room-menu__hint">{t('net.roomMenu.lead')}</p>

      <div className="room-menu__actions">
        <button type="button" className="room-menu__btn room-menu__btn--primary" onClick={() => copyInvite()}>
          {t('net.roomMenu.copyLink')}
        </button>
        <button type="button" className="room-menu__btn" onClick={createPrivate}>
          {t('net.roomMenu.createPrivate')}
        </button>
      </div>

      <form className="room-menu__form" onSubmit={submitJoin}>
        <label className="room-menu__label" htmlFor="room-code-input">
          {t('net.roomMenu.joinLabel')}
        </label>
        <div className="room-menu__row">
          <input
            id="room-code-input"
            type="text"
            value={draft}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('net.roomMenu.placeholder')}
            aria-invalid={invalid}
            onChange={(event) => {
              setDraft(event.target.value)
              setInvalid(false)
            }}
          />
          <button type="submit" className="room-menu__btn room-menu__btn--primary" disabled={!draft.trim()}>
            {t('net.roomMenu.join')}
          </button>
        </div>
        {invalid && <p className="room-menu__error">{t('net.roomMenu.invalid')}</p>}
      </form>

      {requestedRoom && (
        <button type="button" className="room-menu__back" onClick={backToPublic}>
          {t('net.roomMenu.backToPublic')}
        </button>
      )}
    </div>
  )
}

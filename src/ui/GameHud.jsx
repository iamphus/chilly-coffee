import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCafeStore } from '../store.js'
import './gameHud.css'

const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <circle cx="12" cy="15.5" r="1.2" />
    </svg>
  )
}

function OrbitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 0 1-13.7 5.6" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.5 2.8v3.8h-3.8M6.5 21.2v-3.8h3.8" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  )
}

/** Thông báo nhỏ 2 giây; đổi `key` (id thông báo) là chạy lại hiệu ứng từ đầu. */
function Toast({ text }) {
  return (
    <div className="hud-toast" role="status" aria-live="polite">
      {text}
    </div>
  )
}

/**
 * Giao diện khi đang đi lại trong quán: gợi ý điều khiển (tự mờ), thông báo,
 * nút chế độ camera ở góc trên phải (phím tắt V). Ẩn nút camera khi đang ngồi.
 */
export default function GameHud() {
  const { t } = useTranslation()
  const cameraMode = useCafeStore((state) => state.cameraMode)
  const toggleCameraMode = useCafeStore((state) => state.toggleCameraMode)
  const toast = useCafeStore((state) => state.toast)
  const seated = useCafeStore((state) => state.seat !== null)

  useEffect(() => {
    const onKey = (event) => {
      if (event.code !== 'KeyV' || event.repeat || isTyping(event.target) || useCafeStore.getState().seat) return
      toggleCameraMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCameraMode])

  const modeName = t(`game.camera.${cameraMode}`)

  return (
    <div className="hud">
      <p className="hud-hint">{t('game.hint')}</p>

      {toast && (
        <Toast key={toast.id} text={t(toast.key, { mode: t(`game.camera.${toast.params.mode}`) })} />
      )}

      {!seated && (
        <div className="hud-corner">
          <button
            type="button"
            className="hud-button"
            onClick={toggleCameraMode}
            aria-label={t('game.camera.button', { mode: modeName })}
            data-label={modeName}
          >
            {cameraMode === 'locked' ? <LockIcon /> : <OrbitIcon />}
          </button>
        </div>
      )}
    </div>
  )
}

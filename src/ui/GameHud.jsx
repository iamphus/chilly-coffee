import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CHARACTER_COLORS } from '../characters/playableCharacters.js'
import { remainingMs, useFocusStore } from '../focus/focusStore.js'
import { formatTime } from '../focus/format.js'
import { useNow } from '../focus/useNow.js'
import { ACTIONS } from '../player/actionClips.js'
import { TIME_OPTIONS, useCafeStore } from '../store.js'
import LaptopScreen from './laptop/LaptopScreen.jsx'
import NameTag from './NameTag.jsx'
import './gameHud.css'

const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

const ICONS = {
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <circle cx="12" cy="15.5" r="1.2" />
    </>
  ),
  orbit: (
    <>
      <path d="M20 12a8 8 0 0 1-13.7 5.6" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.5 2.8v3.8h-3.8M6.5 21.2v-3.8h3.8" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  exit: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" />,
  map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />,
  muted: <path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6" />,
  sound: <path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />,
  settings: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />,
  rain: <path d="M7 15a4.5 4.5 0 1 1 1.2-8.85A6 6 0 0 1 19.5 9a3.5 3.5 0 0 1-.5 6.97M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />,
  music: <path d="M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />,
  seat: <path d="M6 4v9h12V4M5 13h14v3H5zM7 16v4M17 16v4" />,
  wave: <path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-12 4l-3-4a1.5 1.5 0 0 1 2.3-2L7 13" />,
  drink: <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3" />,
  stretch: <path d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 3l5 6h4l5-6M10 9v5l-2 7M14 9v5l2 7" />,
  yawn: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 9.5h2M14 9.5h2M10 14.5a2 2.5 0 1 0 4 0 2 2.5 0 1 0-4 0z" />,
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
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

/** Đồng hồ Pomodoro thu nhỏ khi đang đi lại (đang ngồi thì đã có trên laptop) */
function TimerChip() {
  const { t } = useTranslation()
  const focus = useFocusStore()
  const now = useNow()
  if (!focus.running) return null
  return (
    <span className={`hud-timer hud-timer--${focus.mode}`}>
      {t(`laptop.pomodoro.${focus.mode}`)} · {formatTime(remainingMs(focus, now))}
    </span>
  )
}

function VolumeSlider({ label, value, onChange }) {
  return (
    <label className="hud-slider">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

/** Cài đặt: chế độ nhẹ, âm lượng, ngày / đêm */
function SettingsPopover({ onClose }) {
  const { t } = useTranslation()
  const store = useCafeStore()
  const lite = useCafeStore((state) => state.lite)
  const setLite = useCafeStore((state) => state.setLite)
  const timeOfDay = useCafeStore((state) => state.timeOfDay)
  const setTimeOfDay = useCafeStore((state) => state.setTimeOfDay)
  const panel = useRef(null)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    const onPointer = (event) => panel.current && !panel.current.parentElement.contains(event.target) && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [onClose])

  return (
    <div ref={panel} className="hud-popover" role="dialog" aria-label={t('game.settings.title')}>
      <label className="hud-switch">
        <input type="checkbox" checked={lite} onChange={(event) => setLite(event.target.checked)} />
        <span>
          <strong>{t('game.settings.lite')}</strong>
          <small>{t('game.settings.liteHint')}</small>
        </span>
      </label>
      <VolumeSlider label={t('game.settings.musicVolume')} value={store.musicVolume} onChange={(musicVolume) => store.setSound({ musicVolume })} />
      <VolumeSlider label={t('game.settings.ambienceVolume')} value={store.ambienceVolume} onChange={(ambienceVolume) => store.setSound({ ambienceVolume })} />
      <fieldset className="hud-segmented">
        <legend>{t('game.settings.time')}</legend>
        {TIME_OPTIONS.map((option) => (
          <label key={option}>
            <input type="radio" name="time-of-day" value={option} checked={timeOfDay === option} onChange={() => setTimeOfDay(option)} />
            <span>{t(`game.settings.timeOptions.${option}`)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}

/**
 * Giao diện khi ở trong quán (theo tham-khao/THAM_KHAO_SANSA.md):
 * gợi ý điều khiển, thông báo, các góc màn hình, nút "Ngồi xuống", thanh hành động, laptop khi ngồi.
 */
export default function GameHud() {
  const { t } = useTranslation()
  const store = useCafeStore()
  const { cameraMode, toast, seat, nearbySeat, action, characterId } = store
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const onKey = (event) => {
      const state = useCafeStore.getState()
      if (state.changingCharacter || event.repeat) return
      if (event.code === 'Escape' && state.seat) {
        if (isTyping(event.target)) event.target.blur()
        else state.standUp()
        return
      }
      if (isTyping(event.target)) return
      if (event.code === 'KeyE') {
        if (state.seat) state.standUp()
        else if (state.nearbySeat) state.sitDown(state.nearbySeat)
      } else if (event.code === 'KeyR') {
        state.toggleRain()
      } else if (event.code === 'KeyV' && !state.seat) {
        state.toggleCameraMode()
      } else if (/^Digit[1-4]$/.test(event.code) && !state.seat) {
        state.toggleAction(ACTIONS[Number(event.code.slice(5)) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const modeName = t(`game.camera.${cameraMode}`)
  const toastText =
    toast && t(toast.key, toast.params?.mode ? { mode: t(`game.camera.${toast.params.mode}`) } : toast.params)

  return (
    <div className="hud">
      <NameTag />
      {!seat && <p className="hud-hint">{t('game.hint')}</p>}
      {toast && <Toast key={toast.id} text={toastText} />}

      {/* Trên trái: rời quán, bản đồ, tên phòng */}
      <div className="hud-corner hud-corner--left">
        <div className="hud-pill">
          <button type="button" className="hud-button" onClick={() => window.location.reload()} aria-label={t('game.exit')} data-label={t('game.exit')}>
            <Icon name="exit" />
          </button>
          <button type="button" className="hud-button" disabled aria-label={t('game.map')} data-label={t('game.map')}>
            <Icon name="map" />
          </button>
          <span className="hud-room">{t('game.room')}</span>
        </div>
        {!seat && <TimerChip />}
      </div>

      {/* Trên phải: nhân vật, camera, âm thanh, cài đặt; bên dưới: nhạc quán */}
      <div className="hud-corner hud-corner--right">
        <div className="hud-pill">
          <button
            type="button"
            className="hud-button"
            onClick={store.openCharacterChange}
            disabled={Boolean(seat)}
            aria-label={t('game.changeCharacter')}
            data-label={t('game.changeCharacter')}
          >
            <span className="hud-dot" style={{ background: CHARACTER_COLORS[characterId] }} />
          </button>
          {!seat && (
            <button
              type="button"
              className="hud-button"
              onClick={store.toggleCameraMode}
              aria-label={t('game.camera.button', { mode: modeName })}
              data-label={`${modeName} (V)`}
            >
              <Icon name={cameraMode === 'locked' ? 'lock' : 'orbit'} />
            </button>
          )}
          <button
            type="button"
            className={store.rain ? 'hud-button hud-button--on' : 'hud-button'}
            onClick={store.toggleRain}
            aria-pressed={store.rain}
            aria-label={t('game.rain.button')}
            data-label={`${t(store.rain ? 'game.rain.on' : 'game.rain.off')} (R)`}
          >
            <Icon name="rain" />
          </button>
          <button
            type="button"
            className="hud-button"
            onClick={() => store.setSound({ muted: !store.muted })}
            aria-pressed={store.muted}
            aria-label={store.muted ? t('game.unmute') : t('game.mute')}
            data-label={store.muted ? t('game.unmute') : t('game.mute')}
          >
            <Icon name={store.muted ? 'muted' : 'sound'} />
          </button>
          <div className="hud-popover-anchor">
            <button
              type="button"
              className="hud-button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-label={t('game.settings.title')}
              data-label={settingsOpen ? '' : t('game.settings.title')}
            >
              <Icon name="settings" />
            </button>
            {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
          </div>
        </div>
        <button
          type="button"
          className={store.musicOn ? 'hud-pill hud-pill--text' : 'hud-pill hud-pill--text hud-pill--off'}
          onClick={() => store.setSound({ musicOn: !store.musicOn })}
          aria-pressed={store.musicOn}
          aria-label={store.musicOn ? t('game.musicOff') : t('game.musicOn')}
        >
          <Icon name="music" />
          {store.musicOn && store.nowPlaying
            ? t('game.nowPlaying', { title: store.nowPlaying.title ?? t('game.trackNumber', { number: store.nowPlaying.index + 1 }) })
            : t('game.musicShort')}
        </button>
      </div>

      {/* Giữa đáy: nút theo ngữ cảnh + thanh hành động */}
      {!seat && (
        <div className="hud-bottom">
          {nearbySeat && (
            <button type="button" className="hud-context" onClick={() => store.sitDown(nearbySeat)}>
              <Icon name="seat" />
              {t('game.sit')}
              <kbd>E</kbd>
            </button>
          )}
          <div className="hud-actions" role="toolbar" aria-label={t('game.actions.label')}>
            {ACTIONS.map((key, index) => (
              <button
                key={key}
                type="button"
                className={action === key ? 'hud-action hud-action--active' : 'hud-action'}
                onClick={() => store.toggleAction(key)}
                aria-pressed={action === key}
                aria-keyshortcuts={String(index + 1)}
              >
                <Icon name={key} />
                <span>{action === key ? t('game.actions.stop') : t(`game.actions.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {seat && <LaptopScreen />}
    </div>
  )
}

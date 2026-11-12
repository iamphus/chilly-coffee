import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { remainingMs, useFocusStore } from '../../focus/focusStore.js'
import { formatTime } from '../../focus/format.js'
import { useNow } from '../../focus/useNow.js'
import { useCafeStore } from '../../store.js'
import NotesApp from './NotesApp.jsx'
import PomodoroApp from './PomodoroApp.jsx'
import TodoApp from './TodoApp.jsx'
import './laptop.css'

const APPS = [
  { key: 'pomodoro', Component: PomodoroApp, icon: <path d="M12 7v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2h6" /> },
  { key: 'todo', Component: TodoApp, icon: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /> },
  { key: 'notes', Component: NotesApp, icon: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" /> },
]

/** Đồng hồ nhỏ trên thanh trên cùng của laptop */
function Clock() {
  const { i18n } = useTranslation()
  const now = useNow(10_000)
  return <span className="laptop-bar__clock">{new Date(now).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
}

/** Đồng hồ Pomodoro thu nhỏ trên thanh trên cùng, để ở ứng dụng khác vẫn thấy */
function TimerChip() {
  const { t } = useTranslation()
  const focus = useFocusStore()
  const now = useNow()
  if (!focus.running) return null
  return (
    <span className={`laptop-bar__timer laptop-bar__timer--${focus.mode}`}>
      {t(`laptop.pomodoro.${focus.mode}`)} · {formatTime(remainingMs(focus, now))}
    </span>
  )
}

/**
 * Màn hình laptop khi ngồi vào bàn: Pomodoro, việc cần làm, ghi chú.
 * Phủ lên giữa cảnh 3D (camera đang nhìn vào laptop thật trên bàn), xung quanh vẫn thấy quán.
 */
export default function LaptopScreen() {
  const { t } = useTranslation()
  const standUp = useCafeStore((state) => state.standUp)
  const [app, setApp] = useState('pomodoro')
  const { Component } = APPS.find((item) => item.key === app)

  return (
    <div className="laptop" role="dialog" aria-modal="false" aria-label={t('laptop.label')}>
      <div className="laptop-screen">
        <header className="laptop-bar">
          <nav className="laptop-bar__apps" aria-label={t('laptop.appsLabel')}>
            {APPS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === app ? 'laptop-tab laptop-tab--active' : 'laptop-tab'}
                aria-current={item.key === app ? 'page' : undefined}
                onClick={() => setApp(item.key)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {item.icon}
                </svg>
                {t(`laptop.apps.${item.key}`)}
              </button>
            ))}
          </nav>
          <TimerChip />
          <Clock />
          <button type="button" className="laptop-bar__stand" onClick={standUp}>
            {t('laptop.standUp')}
            <kbd>Esc</kbd>
          </button>
        </header>
        <div className="laptop-content">
          <Component />
        </div>
      </div>
    </div>
  )
}

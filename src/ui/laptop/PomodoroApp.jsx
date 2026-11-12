import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { DURATION_LIMITS, remainingMs, useFocusStore } from '../../focus/focusStore.js'
import { formatTime } from '../../focus/format.js'
import { requestNotificationPermission } from '../../focus/notifications.js'
import { useNow } from '../../focus/useNow.js'

export default function PomodoroApp() {
  const { t } = useTranslation()
  const focus = useFocusStore()
  const now = useNow()
  const focusId = useId()
  const breakId = useId()

  const left = remainingMs(focus, now)
  const total = (focus.mode === 'focus' ? focus.focusMinutes : focus.breakMinutes) * 60_000
  const progress = total ? 1 - left / total : 0

  const start = () => {
    requestNotificationPermission() // xin quyền thông báo đúng lúc người dùng bấm
    focus.start()
  }

  return (
    <section className={`pomodoro pomodoro--${focus.mode}`} aria-labelledby="pomodoro-title">
      <h2 id="pomodoro-title" className="visually-hidden">
        {t('laptop.apps.pomodoro')}
      </h2>
      <p className="pomodoro__mode">{t(`laptop.pomodoro.${focus.mode}`)}</p>
      <p className="pomodoro__time" role="timer" aria-live="off">
        {formatTime(left)}
      </p>
      <div className="pomodoro__bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>

      <div className="pomodoro__controls">
        {focus.running ? (
          <button type="button" className="laptop-button laptop-button--primary" onClick={focus.pause}>
            {t('laptop.pomodoro.pause')}
          </button>
        ) : (
          <button type="button" className="laptop-button laptop-button--primary" onClick={start}>
            {left < total ? t('laptop.pomodoro.resume') : t('laptop.pomodoro.start')}
          </button>
        )}
        <button type="button" className="laptop-button" onClick={focus.reset}>
          {t('laptop.pomodoro.reset')}
        </button>
        <button type="button" className="laptop-button" onClick={focus.skip}>
          {focus.mode === 'focus' ? t('laptop.pomodoro.skipToBreak') : t('laptop.pomodoro.skipToFocus')}
        </button>
      </div>

      <p className="pomodoro__count">{t('laptop.pomodoro.completed', { count: focus.completedToday })}</p>

      <fieldset className="pomodoro__settings">
        <legend>{t('laptop.pomodoro.settings')}</legend>
        <div>
          <label htmlFor={focusId}>{t('laptop.pomodoro.focusMinutes')}</label>
          <input
            id={focusId}
            type="number"
            min={DURATION_LIMITS.min}
            max={DURATION_LIMITS.max}
            value={focus.focusMinutes}
            onChange={(event) => focus.setDurations(event.target.value, focus.breakMinutes)}
          />
        </div>
        <div>
          <label htmlFor={breakId}>{t('laptop.pomodoro.breakMinutes')}</label>
          <input
            id={breakId}
            type="number"
            min={DURATION_LIMITS.min}
            max={DURATION_LIMITS.max}
            value={focus.breakMinutes}
            onChange={(event) => focus.setDurations(focus.focusMinutes, event.target.value)}
          />
        </div>
      </fieldset>
    </section>
  )
}

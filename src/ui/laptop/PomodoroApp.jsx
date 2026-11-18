import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DURATION_LIMITS, focusStreak, recentDays, remainingMs, useFocusStore } from '../../focus/focusStore.js'
import { formatTime } from '../../focus/format.js'
import { requestNotificationPermission } from '../../focus/notifications.js'
import { useNow } from '../../focus/useNow.js'

function WeeklyStats({ history }) {
  const { t, i18n } = useTranslation()
  const days = useMemo(() => recentDays(history, 7), [history])
  const streak = useMemo(() => focusStreak(history), [history])
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }), [i18n.language])

  const maxCount = Math.max(4, ...days.map((d) => d.count))
  const totalCount = days.reduce((sum, d) => sum + d.count, 0)
  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <div className="pomodoro__weekly" aria-label={t('laptop.pomodoro.weeklyTitle')}>
      <div className="pomodoro__weekly-head">
        <strong>{t('laptop.pomodoro.weeklyTitle')}</strong>
        <span>
          {t('laptop.pomodoro.weeklySummary', { count: totalCount, minutes: totalMinutes })}
          {streak > 0 && <em className="pomodoro__streak">{t('laptop.pomodoro.streak', { count: streak })}</em>}
        </span>
      </div>
      <div className="pomodoro__bars">
        {days.map((day) => {
          const pct = day.count ? Math.max(14, Math.round((day.count / maxCount) * 100)) : 0
          const label = weekdayFmt.format(day.date)
          return (
            <div
              key={day.key}
              className={day.isToday ? 'pomodoro__col pomodoro__col--today' : 'pomodoro__col'}
              title={t('laptop.pomodoro.dayTooltip', { date: day.key, count: day.count, minutes: day.minutes })}
            >
              <span className="pomodoro__col-count">{day.count || ''}</span>
              <div className="pomodoro__col-track">
                <span className="pomodoro__col-fill" style={{ height: `${pct}%` }} />
              </div>
              <span className="pomodoro__col-day">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

      <div className="pomodoro__footer">
        <WeeklyStats history={focus.history} />

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
      </div>
    </section>
  )
}

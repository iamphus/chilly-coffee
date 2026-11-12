import { useProgress } from '@react-three/drei'
import { useTranslation } from 'react-i18next'

/** Màn hình chờ trong lúc tải mô hình quán. Tự ẩn khi tải xong. */
export default function LoadingScreen() {
  const { active, progress } = useProgress()
  const { t } = useTranslation()

  if (!active && progress >= 100) return null

  const percent = Math.round(progress)

  return (
    <div className="overlay" role="status" aria-live="polite">
      <h1>{t('loading.title')}</h1>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t('loading.progress', { percent })}
      >
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>
      <p>{t('loading.progress', { percent })}</p>
    </div>
  )
}

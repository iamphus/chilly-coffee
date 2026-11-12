import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import landingVideo1080 from '../../assets/video/landing-1080p.mp4'
import landingVideo1440 from '../../assets/video/landing-1440p.mp4'
import landingPoster from '../../assets/video/landing-poster.jpg'
import { loadCafeCanvas } from '../scene/loadCafeCanvas.js'
import { useCafeStore } from '../store.js'

const LEAVE_DURATION_MS = 700 // khớp với transition của .landing--leaving trong styles.css
const PREFETCH_IDLE_TIMEOUT_MS = 4000

// Bản 2K (~14 MB) chỉ cho màn hình rộng hoặc màn hình độ phân giải cao; còn lại dùng 1080p (~9 MB)
const VIDEO_2K_MEDIA = '(min-width: 1600px), (min-width: 1000px) and (min-resolution: 1.5dppx)'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Người dùng bật "tiết kiệm dữ liệu" thì không tải trước ~10 MB mô hình 3D
const saveData = navigator.connection?.saveData === true

const requestIdle = window.requestIdleCallback ?? ((callback) => setTimeout(callback, 2000))
const cancelIdle = window.cancelIdleCallback ?? clearTimeout

function CupLogo() {
  return (
    <svg className="cup-logo" viewBox="0 0 40 40" aria-hidden="true">
      <path className="cup-logo__steam" d="M15 13c-2-3 2-4 0-7" />
      <path className="cup-logo__steam cup-logo__steam--late" d="M21 13c-2-3 2-4 0-7" />
      <path className="cup-logo__cup" d="M8 17h22v7a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z" />
      <path className="cup-logo__handle" d="M30 19h2a4 4 0 0 1 0 8h-2.5" />
    </svg>
  )
}

const FEATURE_ICONS = {
  focus: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </>
  ),
  music: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </>
  ),
  together: (
    <>
      <circle cx="8" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M2 20c.5-4 3-6 6-6s5.5 2 6 6M14.5 15.5c.8-.9 1.7-1.3 2.5-1.3 2.4 0 4.3 1.8 4.8 5" />
    </>
  ),
}

const FEATURES = [
  { key: 'focus' },
  { key: 'music' },
  { key: 'together', soon: true },
]

/**
 * Tải trước phần 3D khi trình duyệt rảnh, sau khi video nền đã đủ để chạy
 * (để mô hình 9 MB không tranh băng thông với video).
 */
function usePrefetchCafe() {
  const scheduled = useRef(false)
  const idleId = useRef(null)

  const schedule = () => {
    if (scheduled.current || saveData) return
    scheduled.current = true
    idleId.current = requestIdle(
      () => {
        loadCafeCanvas().catch(() => {}) // lỗi thật sẽ hiện lúc bấm "Vào quán"
      },
      { timeout: PREFETCH_IDLE_TIMEOUT_MS },
    )
  }

  useEffect(() => () => cancelIdle(idleId.current), [])

  return schedule
}

/** Màn hình đầu tiên: video quảng cáo quán chạy nền, giới thiệu và nút "Vào quán". */
export default function Landing() {
  const { t } = useTranslation()
  const entered = useCafeStore((state) => state.entered)
  const sceneReady = useCafeStore((state) => state.sceneReady)
  const loadProgress = useCafeStore((state) => state.loadProgress)
  const enterCafe = useCafeStore((state) => state.enterCafe)
  const [gone, setGone] = useState(false)
  const video = useRef(null)
  const prefetchCafe = usePrefetchCafe()

  const leaving = entered && sceneReady

  // Không tự chạy video (giảm chuyển động) thì không có sự kiện video, tải trước luôn khi rảnh
  useEffect(() => {
    if (prefersReducedMotion) prefetchCafe()
  }, [prefetchCafe])

  // Cảnh 3D sẵn sàng: dừng video, mờ landing rồi gỡ hẳn
  useEffect(() => {
    if (!leaving) return
    video.current?.pause()
    const timer = setTimeout(() => setGone(true), LEAVE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  if (gone) return null

  const percent = Math.round(loadProgress)
  // Chỉ hiện % khi đang tải thật; 0% (chưa kịp đo) hoặc 100% (đang dựng cảnh) thì chỉ hiện chữ
  const buttonLabel = !entered
    ? t('landing.enter')
    : percent > 0 && percent < 100
      ? t('landing.loading', { percent })
      : t('landing.preparing')
  const className = ['landing', leaving && 'landing--leaving'].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <div className="landing__backdrop" aria-hidden="true" />
      <video
        ref={video}
        className="landing__video"
        poster={landingPoster}
        autoPlay={!prefersReducedMotion}
        preload={prefersReducedMotion ? 'none' : 'auto'}
        muted
        loop
        playsInline
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onCanPlayThrough={prefetchCafe}
        onError={prefetchCafe}
      >
        <source src={landingVideo1440} type="video/mp4" media={VIDEO_2K_MEDIA} />
        <source src={landingVideo1080} type="video/mp4" onError={prefetchCafe} />
      </video>
      <div className="landing__scrim" aria-hidden="true" />

      <header className="landing__header">
        <CupLogo />
        <span className="landing__brand">Chilly Coffee</span>
        <span className="pill">{t('landing.badge')}</span>
      </header>

      <main className="landing__hero">
        <p className="landing__eyebrow">{t('landing.eyebrow')}</p>
        <h1 className="landing__title">{t('landing.title')}</h1>
        <p className="landing__lead">{t('landing.lead')}</p>

        <div className="landing__cta">
          <button
            type="button"
            className="btn-enter"
            onClick={enterCafe}
            disabled={entered}
            aria-busy={entered && !sceneReady}
            style={{ '--progress': `${percent}%` }}
          >
            {buttonLabel}
          </button>
          <p className="landing__note">{t('landing.note')}</p>
        </div>

        <ul className="landing__features">
          {FEATURES.map(({ key, soon }) => (
            <li key={key} className="feature">
              <svg className="feature__icon" viewBox="0 0 24 24" aria-hidden="true">
                {FEATURE_ICONS[key]}
              </svg>
              <div>
                <h2 className="feature__title">
                  {t(`landing.features.${key}.title`)}
                  {soon && <span className="pill pill--soft">{t('landing.soon')}</span>}
                </h2>
                <p className="feature__text">{t(`landing.features.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadYoutubeApi } from '../../audio/youtube/loadYoutubeApi.js'
import { useYoutubeStore } from '../../audio/youtube/youtubeStore.js'
import { useCafeStore } from '../../store.js'

// Trình phát YouTube chính thức (IFrame Player API) cho nhạc riêng, theo chính sách YouTube:
// luôn hiển thị (≥ 200×200 px), giữ nguyên logo / nút / quảng cáo, chỉ phát khi đang đeo tai nghe,
// vẫn phát liên tục khi chuyển sang tab khác để học/làm việc, bị huỷ khi gập laptop (ghi lại chỗ đang nghe).
// Nơi dùng đặt key theo link (`${type}:${id}`) để đổi link là dựng lại từ đầu.
const FADE_IN_MS = 600
const FADE_OUT_MS = 500
const FADE_STEPS = 12
const UNAVAILABLE = new Set([100, 101, 150, 153]) // video bị xoá / riêng tư / chủ kênh tắt nhúng

function buildEmbedUrl(source, resume, autoplay) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    autoplay: autoplay ? '1' : '0',
  })
  const start = Math.floor(resume?.time ?? 0)
  if (start > 0) params.set('start', String(start))
  if (window.location?.origin && /^https?:/i.test(window.location.origin)) {
    params.set('origin', window.location.origin)
  }
  if (source.type === 'playlist') {
    params.set('listType', 'playlist')
    params.set('list', source.id)
    if (resume?.index > 0) params.set('index', String(resume.index))
    return `https://www.youtube.com/embed/videoseries?${params.toString()}`
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(source.id)}?${params.toString()}`
}

export default function YoutubePlayer() {
  const { t } = useTranslation()
  const source = useYoutubeStore((state) => state.source)
  const headphones = useCafeStore((state) => state.headphones)
  const host = useRef(null)
  const player = useRef(null)
  const fade = useRef({ timer: 0, volume: 100 })
  const prevHeadphones = useRef(headphones)
  const [status, setStatus] = useState('loading') // 'loading' | 'iframe' | 'ready' | 'error' | 'unavailable'

  // Dựng trình phát mỗi khi đổi link; gỡ khi gập laptop
  useEffect(() => {
    if (!source || !host.current) return undefined
    let cancelled = false
    let instance = null
    const fadeState = fade.current

    const { resume } = useYoutubeStore.getState()
    const shouldAutoplay = useCafeStore.getState().headphones
    prevHeadphones.current = shouldAutoplay

    // Dựng trực tiếp thẻ <iframe> chuẩn với đầy đủ quyền autoplay + encrypted-media + referrerPolicy
    // để tránh lỗi quay vòng vô tận trên Chrome/Edge và vẫn cho phép bấm trực tiếp vào nút Play của YouTube.
    const iframe = document.createElement('iframe')
    iframe.src = buildEmbedUrl(source, resume, shouldAutoplay)
    iframe.title = 'YouTube video player'
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.allowFullscreen = true
    iframe.addEventListener('load', () => {
      if (!cancelled) setStatus((prev) => (prev === 'loading' ? 'iframe' : prev))
    })
    host.current.replaceChildren(iframe)

    loadYoutubeApi()
      .then((YT) => {
        if (cancelled) return
        instance = new YT.Player(iframe, {
          events: {
            onReady: () => {
              if (cancelled) return
              player.current = instance
              setStatus('ready')
              instance.unMute?.()
              instance.setVolume?.(fadeState.volume)
              if (useCafeStore.getState().headphones) {
                instance.playVideo?.()
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                instance.unMute?.()
                if ((instance.getVolume?.() ?? 100) < 15) {
                  instance.setVolume?.(fadeState.volume)
                }
                // Bấm phát ngay trên trình phát = tự đeo tai nghe (nhạc quán dịu xuống)
                if (!useCafeStore.getState().headphones) {
                  prevHeadphones.current = true
                  useCafeStore.getState().setHeadphones(true)
                }
              }
            },
            onError: (event) => {
              if (UNAVAILABLE.has(event.data) && source.type === 'playlist') {
                useCafeStore.getState().showToast('laptop.music.skipped')
                instance.nextVideo?.()
              } else {
                setStatus(UNAVAILABLE.has(event.data) ? 'unavailable' : 'error')
              }
            },
          },
        })
      })
      .catch(() => {
        // Nếu trình chặn quảng cáo chặn script iframe_api nhưng khung nhúng vẫn tải được, giữ nguyên khung nhúng để bấm tay
        if (!cancelled) setStatus((prev) => (prev === 'iframe' ? 'iframe' : 'error'))
      })

    return () => {
      cancelled = true
      clearInterval(fadeState.timer)
      if (instance && player.current === instance) {
        try {
          const index = source.type === 'playlist' ? Math.max(0, instance.getPlaylistIndex?.() ?? 0) : 0
          const duration = instance.getDuration?.() ?? 0
          const current = instance.getCurrentTime?.() ?? 0
          // Livestream 24/7 (duration <= 0) hoặc đã sát cuối bài thì lần sau mở từ điểm trực tiếp / đầu bài
          const time = duration > 0 && current > 0 && current < duration - 3 ? current : 0
          useYoutubeStore.getState().saveResume({ index, time })
        } catch {
          // trình phát chưa sẵn sàng thì giữ chỗ cũ
        }
      }
      instance?.destroy?.()
      player.current = null
    }
  }, [source])

  // Đeo tai nghe: bật tiếng, phát và tăng âm lượng dần; tháo: giảm dần rồi dừng hẳn (khôi phục thanh âm lượng cho lần sau)
  useEffect(() => {
    const instance = player.current
    if (status !== 'ready' || !instance) {
      prevHeadphones.current = headphones
      return undefined
    }
    if (prevHeadphones.current === headphones) return undefined
    prevHeadphones.current = headphones

    const state = fade.current
    clearInterval(state.timer)

    if (headphones) {
      instance.unMute?.()
      const goal = state.volume
      if (instance.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
        instance.setVolume?.(goal)
        return undefined
      }
      let current = Math.min(25, goal)
      instance.setVolume?.(current)
      instance.playVideo?.()
      const step = (goal - current) / FADE_STEPS
      let count = 0
      state.timer = setInterval(() => {
        count += 1
        current = count >= FADE_STEPS ? goal : current + step
        instance.setVolume?.(Math.round(current))
        if (count >= FADE_STEPS) clearInterval(state.timer)
      }, FADE_IN_MS / FADE_STEPS)
    } else {
      const vol = instance.getVolume?.() ?? state.volume
      if (vol >= 15 && !instance.isMuted?.()) state.volume = vol
      let current = vol
      const step = -current / FADE_STEPS
      let count = 0
      state.timer = setInterval(() => {
        count += 1
        current = count >= FADE_STEPS ? 0 : current + step
        instance.setVolume?.(Math.max(0, Math.round(current)))
        if (count >= FADE_STEPS) {
          clearInterval(state.timer)
          instance.pauseVideo?.()
          instance.setVolume?.(state.volume)
        }
      }, FADE_OUT_MS / FADE_STEPS)
    }

    return () => clearInterval(state.timer)
  }, [headphones, status])

  const showStatus = status === 'loading' || status === 'error' || status === 'unavailable'

  return (
    <div className="youtube-player">
      <div ref={host} className="youtube-player__frame" />
      {showStatus && (
        <p
          className={
            status === 'loading'
              ? 'youtube-player__status youtube-player__status--loading'
              : 'youtube-player__status youtube-player__status--error'
          }
          role="status"
        >
          {t(`laptop.music.status.${status}`)}
        </p>
      )}
    </div>
  )
}

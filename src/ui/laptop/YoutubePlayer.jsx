import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadYoutubeApi } from '../../audio/youtube/loadYoutubeApi.js'
import { useYoutubeStore } from '../../audio/youtube/youtubeStore.js'
import { useCafeStore } from '../../store.js'

// Trình phát YouTube chính thức (IFrame Player API) cho nhạc riêng, theo chính sách YouTube:
// luôn hiển thị (≥ 200×200 px), giữ nguyên logo / nút / quảng cáo, chỉ phát khi đang đeo tai nghe,
// dừng khi ẩn tab, bị huỷ khi gập laptop (ghi lại chỗ đang nghe để lần sau nghe tiếp).
// Nơi dùng đặt key theo link (`${type}:${id}`) để đổi link là dựng lại từ đầu, trạng thái về 'loading'.
const FADE_MS = 1000
const FADE_STEPS = 20
const UNAVAILABLE = new Set([100, 101, 150]) // video bị xoá / chủ kênh tắt nhúng

export default function YoutubePlayer() {
  const { t } = useTranslation()
  const source = useYoutubeStore((state) => state.source)
  const headphones = useCafeStore((state) => state.headphones)
  const host = useRef(null)
  const player = useRef(null)
  const fade = useRef({ timer: 0, volume: 100 })
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error' | 'unavailable'

  // Dựng trình phát mỗi khi đổi link; gỡ khi gập laptop
  useEffect(() => {
    if (!source) return undefined
    let cancelled = false
    let instance = null
    const fadeState = fade.current

    loadYoutubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return
        const target = document.createElement('div')
        host.current.replaceChildren(target) // API thay thẻ này bằng iframe
        instance = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              if (cancelled) return
              const { resume } = useYoutubeStore.getState()
              const startSeconds = Math.floor(resume.time)
              if (source.type === 'playlist') {
                instance.cuePlaylist({ listType: 'playlist', list: source.id, index: resume.index, startSeconds })
              } else {
                instance.cueVideoById({ videoId: source.id, startSeconds })
              }
              player.current = instance
              setStatus('ready')
            },
            onStateChange: (event) => {
              // Bấm phát ngay trên trình phát = đeo tai nghe (nhạc quán tắt dần)
              if (event.data === YT.PlayerState.PLAYING) useCafeStore.getState().setHeadphones(true)
            },
            onError: (event) => {
              if (UNAVAILABLE.has(event.data) && source.type === 'playlist') {
                useCafeStore.getState().showToast('laptop.music.skipped')
                instance.nextVideo()
              } else {
                setStatus(UNAVAILABLE.has(event.data) ? 'unavailable' : 'error')
              }
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      clearInterval(fadeState.timer)
      if (instance && player.current === instance) {
        try {
          const index = source.type === 'playlist' ? Math.max(0, instance.getPlaylistIndex() ?? 0) : 0
          useYoutubeStore.getState().saveResume({ index, time: Math.max(0, instance.getCurrentTime() ?? 0) })
        } catch {
          // trình phát chưa sẵn sàng thì giữ chỗ cũ
        }
      }
      instance?.destroy?.()
      player.current = null
    }
  }, [source])

  // Đeo tai nghe: phát và tăng âm lượng dần; tháo: giảm dần rồi dừng hẳn
  useEffect(() => {
    const instance = player.current
    if (status !== 'ready' || !instance) return
    const state = fade.current
    clearInterval(state.timer)
    let current = instance.getVolume?.() ?? 0
    const goal = headphones ? state.volume : 0
    if (headphones) {
      if (instance.getPlayerState?.() !== window.YT.PlayerState.PLAYING) {
        current = 0
        instance.setVolume(0)
      }
      instance.playVideo()
    } else if (current > 0) {
      state.volume = current // nhớ âm lượng người dùng chỉnh trên trình phát
    }
    const step = (goal - current) / FADE_STEPS
    let count = 0
    state.timer = setInterval(() => {
      count += 1
      current = count >= FADE_STEPS ? goal : current + step
      instance.setVolume(Math.round(current))
      if (count >= FADE_STEPS) {
        clearInterval(state.timer)
        if (!headphones) instance.pauseVideo()
      }
    }, FADE_MS / FADE_STEPS)
    return () => clearInterval(state.timer)
  }, [headphones, status])

  // Ẩn tab / thu nhỏ cửa sổ: không phát khi trình phát không còn hiển thị
  useEffect(() => {
    const onVisibility = () => {
      const instance = player.current
      if (!instance || status !== 'ready') return
      if (document.hidden) instance.pauseVideo()
      else if (useCafeStore.getState().headphones) instance.playVideo()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [status])

  return (
    <div className="youtube-player">
      <div ref={host} className="youtube-player__frame" />
      {status !== 'ready' && (
        <p className={status === 'loading' ? 'youtube-player__status' : 'youtube-player__status youtube-player__status--error'} role="status">
          {t(`laptop.music.status.${status}`)}
        </p>
      )}
    </div>
  )
}

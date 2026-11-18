import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useCafeStore } from '../store.js'

// Hai màn hình "Đang phát" gắn tường: một chiếc sau quầy barista (phòng chính), một chiếc ở tường sau phòng lớn.
const SCREENS = [
  [-2.38, 2.12, -2.975], // phòng chính: giữa kệ quầy pha chế và tủ mát
  [1.95, 2.08, -12.945], // phòng lớn: phía trên góc sofa da, hướng về dãy bàn học
]

const TEX_W = 512
const TEX_H = 192

let shared = null

function getScreenSurface() {
  if (shared) return shared
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  shared = { canvas, ctx, texture }
  return shared
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let trimmed = text
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed}…`
}

function paintScreen({ eyebrow, title, subtitle, active }) {
  const { ctx, texture } = getScreenSurface()
  ctx.clearRect(0, 0, TEX_W, TEX_H)

  // Nền màn hình nâu trầm ấm
  const bg = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  bg.addColorStop(0, '#181310')
  bg.addColorStop(1, '#261d17')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  ctx.strokeStyle = 'rgba(255, 209, 166, 0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(8, 8, TEX_W - 16, TEX_H - 16)

  // Đĩa than trang trí bên trái
  const cx = 78
  const cy = TEX_H / 2
  ctx.beginPath()
  ctx.arc(cx, cy, 50, 0, Math.PI * 2)
  ctx.fillStyle = '#0f0c0a'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1.5
  for (const r of [42, 34, 26]) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, 17, 0, Math.PI * 2)
  ctx.fillStyle = active ? '#df8b46' : '#5e5046'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#181310'
  ctx.fill()

  // Chữ bên phải
  const left = 148
  const maxWidth = TEX_W - left - 24
  ctx.textBaseline = 'alphabetic'

  ctx.beginPath()
  ctx.arc(left + 5, 55, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = active ? '#6ad17b' : '#8c7a6b'
  ctx.fill()

  ctx.font = '800 17px Nunito, system-ui, sans-serif'
  ctx.fillStyle = active ? '#ffd1a6' : '#a89687'
  ctx.fillText(fitText(ctx, eyebrow.toUpperCase(), maxWidth - 18), left + 16, 61)

  ctx.font = '800 30px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#f6eee3'
  ctx.fillText(fitText(ctx, title, maxWidth), left, 108)

  ctx.font = '600 19px Nunito, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(246, 238, 227, 0.68)'
  ctx.fillText(fitText(ctx, subtitle, maxWidth), left, 144)

  texture.needsUpdate = true
}

/**
 * Màn hình TV mỏng trong quán hiện bài nhạc đang phát (kèm tên tác giả / giấy phép cho bài CC BY).
 * Chỉ vẽ lại canvas mỗi khi đổi bài, bật/tắt đài hoặc đổi ngôn ngữ — không tốn CPU mỗi khung hình.
 */
export default function NowPlayingSign() {
  const { t, i18n } = useTranslation()
  const invalidate = useThree((state) => state.invalidate)
  const nowPlaying = useCafeStore((state) => state.nowPlaying)
  const musicOn = useCafeStore((state) => state.musicOn)
  const headphones = useCafeStore((state) => state.headphones)
  const { texture } = getScreenSurface()

  useEffect(() => {
    const active = musicOn && !headphones && Boolean(nowPlaying)
    const eyebrow = headphones
      ? t('game.headphones.on')
      : musicOn
        ? t('game.tv.onAir')
        : t('laptop.music.radioOff')

    const title = nowPlaying
      ? (nowPlaying.title ?? t('game.trackNumber', { number: nowPlaying.index + 1 }))
      : musicOn
        ? t('laptop.music.radioWaiting')
        : t('game.musicShort')

    const creditParts = [nowPlaying?.artist, nowPlaying?.license].filter(Boolean)
    const subtitle = headphones
      ? t('game.tv.headphonesSub')
      : creditParts.length
        ? creditParts.join(' · ')
        : t('game.tv.stationSub')

    paintScreen({ eyebrow, title, subtitle, active })
    invalidate()
  }, [headphones, i18n.language, invalidate, musicOn, nowPlaying, t])

  return (
    <group name="Man_Hinh_Nhac">
      {SCREENS.map(([x, y, z], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.94, 0.36, 0.03]} />
            <meshStandardMaterial color="#1f1814" roughness={0.55} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.016]}>
            <planeGeometry args={[0.88, 0.3]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

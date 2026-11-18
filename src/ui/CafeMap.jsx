import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { excludedNpcIds } from '../characters/appearance.js'
import { peerMotion, useNetStore } from '../net/netStore.js'
import { isBlocked, NAV_GRID } from '../player/nav.js'
import { playerBridge } from '../player/playerBridge.js'
import { occupiedSeats } from '../scene/guestList.js'
import { SEAT_NAMES, SEATS, seatPose } from '../scene/seating.js'
import { useCafeStore } from '../store.js'

// Khung toạ độ thế giới (mét) bao trọn quán + hẻm + mặt đường trước quán
const BOUNDS = { xMin: -7.2, xMax: 4.2, zMin: -13.6, zMax: 4.6 }
const SCALE = 20 // px mỗi mét
const MAP_W = Math.round((BOUNDS.xMax - BOUNDS.xMin) * SCALE)
const MAP_H = Math.round((BOUNDS.zMax - BOUNDS.zMin) * SCALE)
const HIT_RADIUS = 10 // px: bán kính bắt chuột vào ghế

const toPx = (x, z) => [(x - BOUNDS.xMin) * SCALE, (z - BOUNDS.zMin) * SCALE]
const toWorld = (px, py) => [BOUNDS.xMin + px / SCALE, BOUNDS.zMin + py / SCALE]

const SEAT_POINTS = SEAT_NAMES.map((name) => {
  const { position } = seatPose(name)
  const [px, py] = toPx(position[0], position[2])
  return {
    name,
    number: Number(name.slice(4)),
    label: SEATS[name]?.label ?? name,
    x: position[0],
    z: position[2],
    px,
    py,
  }
})

let cachedFloorplan = null

/** Vẽ nền sơ đồ quán một lần từ lưới đi lại nav.json để các khung hình sau chỉ chép lại. */
function getFloorplanCanvas() {
  if (cachedFloorplan) return cachedFloorplan
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(MAP_W, MAP_H)
  const pixels = image.data
  const { x0, z0, cell, w, h, data } = NAV_GRID

  for (let py = 0; py < MAP_H; py++) {
    const z = BOUNDS.zMin + (py + 0.5) / SCALE
    const r = Math.floor((z - z0) / cell)
    for (let px = 0; px < MAP_W; px++) {
      const x = BOUNDS.xMin + (px + 0.5) / SCALE
      const c = Math.floor((x - x0) / cell)
      const blocked = r < 0 || c < 0 || r >= h || c >= w || data[r * w + c] === 1
      const inCafe = x > -3.95 && x < 3.75 && z > -13.3 && z < 3.15
      const inGarden = x > -3.6 && x < 0.4 && z > -6.2 && z < -3.2

      let red = 24
      let green = 20
      let blue = 18
      if (inGarden) {
        ;[red, green, blue] = blocked ? [33, 45, 32] : [56, 76, 53]
      } else if (inCafe) {
        ;[red, green, blue] = blocked ? [38, 29, 23] : [78, 59, 45]
      } else if (!blocked) {
        ;[red, green, blue] = [48, 43, 39]
      }

      const idx = (py * MAP_W + px) * 4
      pixels[idx] = red
      pixels[idx + 1] = green
      pixels[idx + 2] = blue
      pixels[idx + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  cachedFloorplan = canvas
  return canvas
}

/**
 * Sơ đồ quán 2D tương tác (nút Bản đồ góc trái hoặc phím M).
 * Hiện 4 khu vực, 28 bàn (trống / có người / mình đang ngồi), người cùng phòng và vị trí của mình;
 * bấm vào bàn trống để nhân vật tự đi tới ngồi, hoặc bấm lên lối đi để di chuyển tới đó.
 */
export default function CafeMap({ onClose }) {
  const { t } = useTranslation()
  const appearance = useCafeStore((state) => state.appearance)
  const mySeat = useCafeStore((state) => state.seat)
  const showToast = useCafeStore((state) => state.showToast)
  const peers = useNetStore((state) => state.peers)
  const panelRef = useRef(null)
  const canvasRef = useRef(null)
  const [hovered, setHovered] = useState(null)

  const { npcSeats, peerSeats } = useMemo(() => {
    const pSeats = new Set(Object.values(peers).map((peer) => peer.seat).filter(Boolean))
    const nSeats = occupiedSeats(excludedNpcIds(appearance))
    for (const s of pSeats) nSeats.delete(s)
    if (mySeat) nSeats.delete(mySeat)
    return { npcSeats: nSeats, peerSeats: pSeats }
  }, [appearance, mySeat, peers])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event) => {
      if (panelRef.current && !panelRef.current.parentElement.contains(event.target)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = MAP_W * dpr
    canvas.height = MAP_H * dpr
    const ctx = canvas.getContext('2d')
    const base = getFloorplanCanvas()

    const zones = [
      { key: 'study', x: 0.1, z: -12.3 },
      { key: 'garden', x: -1.65, z: -5.5 },
      { key: 'back', x: 2.05, z: -5.5 },
      { key: 'main', x: 0.4, z: 0.2 },
      { key: 'street', x: -1.8, z: 4.05 },
    ]

    const draw = () => {
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.drawImage(base, 0, 0)

      // Nhãn khu vực
      ctx.font = '700 9px Nunito, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255, 243, 228, 0.42)'
      for (const zone of zones) {
        const [zx, zy] = toPx(zone.x, zone.z)
        ctx.fillText(t(`game.mapModal.zones.${zone.key}`).toUpperCase(), zx, zy)
      }

      // 28 chỗ ngồi
      for (const seat of SEAT_POINTS) {
        const isMine = mySeat === seat.name
        const isPeer = peerSeats.has(seat.name)
        const isNpc = npcSeats.has(seat.name)
        const isFree = !isMine && !isPeer && !isNpc
        const isHover = hovered?.name === seat.name
        const radius = isHover || isMine ? 7 : 5.6

        ctx.beginPath()
        ctx.arc(seat.px, seat.py, radius, 0, Math.PI * 2)
        ctx.fillStyle = isMine
          ? '#56b368'
          : isPeer
            ? '#7fb6d9'
            : isNpc
              ? 'rgba(130, 108, 92, 0.55)'
              : isHover
                ? '#ffd1a6'
                : '#df8b46'
        ctx.fill()
        if (isMine || isHover) {
          ctx.lineWidth = 1.6
          ctx.strokeStyle = '#fff'
          ctx.stroke()
        }

        ctx.font = '800 7.5px Nunito, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isHover && isFree ? '#2b221c' : '#fff'
        ctx.fillText(String(seat.number), seat.px, seat.py + 0.5)
      }

      // Người cùng phòng đang đi bộ
      for (const [id, peer] of Object.entries(peers)) {
        if (peer.seat) continue
        const motion = peerMotion.get(id)
        const [px, py] = toPx(motion?.x ?? peer.x ?? 0, motion?.z ?? peer.z ?? 0)
        ctx.beginPath()
        ctx.arc(px, py, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#8fbfdc'
        ctx.fill()
        ctx.lineWidth = 1.4
        ctx.strokeStyle = '#1b1613'
        ctx.stroke()
      }

      // Vị trí của mình (khi đang đi lại) + mũi tên hướng mặt
      if (!mySeat) {
        const [mx, my] = toPx(playerBridge.x, playerBridge.z)
        const dirX = Math.sin(playerBridge.yaw)
        const dirY = Math.cos(playerBridge.yaw)

        ctx.beginPath()
        ctx.moveTo(mx + dirX * 9.5, my + dirY * 9.5)
        ctx.lineTo(mx - dirY * 4.2, my + dirX * 4.2)
        ctx.lineTo(mx + dirY * 4.2, my - dirX * 4.2)
        ctx.closePath()
        ctx.fillStyle = '#9fe0a8'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(mx, my, 5.2, 0, Math.PI * 2)
        ctx.fillStyle = '#4e8c5a'
        ctx.fill()
        ctx.lineWidth = 1.8
        ctx.strokeStyle = '#fff'
        ctx.stroke()
      }

      ctx.restore()
    }

    draw()
    const timer = setInterval(draw, 80)
    return () => clearInterval(timer)
  }, [hovered, mySeat, npcSeats, peerSeats, peers, t])

  const locatePointer = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * MAP_W
    const py = ((event.clientY - rect.top) / rect.height) * MAP_H
    let nearest = null
    let best = HIT_RADIUS
    for (const seat of SEAT_POINTS) {
      const d = Math.hypot(seat.px - px, seat.py - py)
      if (d < best) {
        best = d
        nearest = seat
      }
    }
    return { px, py, seat: nearest }
  }

  const onMove = (event) => {
    const { seat } = locatePointer(event)
    setHovered((prev) => (prev?.name === seat?.name ? prev : seat))
  }

  const onClick = (event) => {
    const { px, py, seat } = locatePointer(event)
    if (seat) {
      const busy = seat.name !== mySeat && (peerSeats.has(seat.name) || npcSeats.has(seat.name))
      if (busy) {
        showToast('game.mapModal.seatBusy', { number: seat.number })
        return
      }
      if (playerBridge.walkTo?.(seat.x, seat.z, seat.name)) {
        showToast('game.mapModal.goingToSeat', { number: seat.number })
        onClose()
      }
      return
    }
    const [wx, wz] = toWorld(px, py)
    if (!isBlocked(wx, wz) && playerBridge.walkTo?.(wx, wz, null)) {
      onClose()
    }
  }

  const freeCount = SEAT_POINTS.length - npcSeats.size - peerSeats.size - (mySeat ? 1 : 0)
  const hoverBusy = hovered && hovered.name !== mySeat && (peerSeats.has(hovered.name) || npcSeats.has(hovered.name))

  return (
    <div ref={panelRef} className="hud-popover hud-popover--left cafe-map" role="dialog" aria-label={t('game.mapModal.title')}>
      <header className="cafe-map__header">
        <strong>{t('game.mapModal.title')}</strong>
        <span>{t('game.mapModal.freeSeats', { count: Math.max(0, freeCount) })}</span>
      </header>

      <canvas
        ref={canvasRef}
        className="cafe-map__canvas"
        style={{ width: MAP_W, height: MAP_H, cursor: hovered && !hoverBusy ? 'pointer' : 'crosshair' }}
        onPointerMove={onMove}
        onPointerLeave={() => setHovered(null)}
        onClick={onClick}
      />

      <p className="cafe-map__status">
        {hovered
          ? `${hovered.label} · ${
              hovered.name === mySeat
                ? t('game.mapModal.yourSeat')
                : hoverBusy
                  ? t('game.mapModal.occupied')
                  : t('game.mapModal.clickToSit')
            }`
          : t('game.mapModal.hint')}
      </p>

      <div className="cafe-map__legend" aria-hidden="true">
        <span>
          <i className="cafe-map__swatch cafe-map__swatch--free" />
          {t('game.mapModal.legendFree')}
        </span>
        <span>
          <i className="cafe-map__swatch cafe-map__swatch--peer" />
          {t('game.mapModal.legendPeer')}
        </span>
        <span>
          <i className="cafe-map__swatch cafe-map__swatch--me" />
          {t('game.me')}
        </span>
      </div>
    </div>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import Character from '../characters/Character.jsx'
import { findPath } from '../player/nav.js'
import { CLIPS, preloadCharacters } from '../characters/characterAssets.js'

// Đường đi trên phố, toạ độ [x, z] (lấy từ bản thử): dọc mặt tiền rồi rẽ vào hẻm bên hông.
const STREET = [
  [7.5, 6.0],
  [-6.4, 6.0],
  [-6.4, -15.5],
]
const SIDEWALK = [
  [5.5, 6.6],
  [-7.2, 6.6],
]

// Nhân viên đi lại phục vụ trong phòng chính: từ dãy bàn sát kính trước vòng ra phía sau bên phải.
// Tìm đường trên lưới đi lại để không đi xuyên bàn ghế.
const INSIDE_FROM = [-1.8, 1.8]
const INSIDE_TO = [2.6, -2.0]
const INSIDE = (() => {
  const route = findPath(...INSIDE_FROM, ...INSIDE_TO)
  return route ? [INSIDE_FROM, ...route] : null
})()

// speed: mét/giây; offset: quãng đường đã đi lúc bắt đầu, để mọi người không đi sát nhau
const WALKERS = [
  { id: 'passerby_backpack', path: STREET, speed: 1.0, offset: 3 },
  { id: 'passerby_office', path: STREET, speed: 1.15, offset: 16 },
  { id: 'passerby_umbrella', path: STREET, speed: 0.8, offset: 25 },
  { id: 'passerby_jogger', path: STREET, speed: 2.3, offset: 9, timeScale: 1.9 },
  { id: 'guest_headphones', path: SIDEWALK, speed: 0.9, offset: 4 },
  ...(INSIDE ? [{ id: 'barista_2', path: INSIDE, speed: 0.7, offset: 2 }] : []),
]

const TURN_SPEED = 8

function buildSegments(path) {
  const points = path.map(([x, z]) => new Vector3(x, 0, z))
  const segments = []
  let length = 0
  for (let i = 0; i < points.length - 1; i++) {
    const segmentLength = points[i].distanceTo(points[i + 1])
    segments.push({ from: points[i], to: points[i + 1], start: length, length: segmentLength })
    length += segmentLength
  }
  return { segments, length }
}

/**
 * Một người đi qua đi lại trên một đường gấp khúc (đi hết thì quay đầu).
 * Vị trí tính thẳng từ đồng hồ cảnh nên luôn giống nhau ở cùng một thời điểm (video quay lại vẫn khớp).
 */
function Walker({ id, path, speed, offset, timeScale = 1 }) {
  const group = useRef(null)
  const route = useMemo(() => buildSegments(path), [path])
  const direction = useMemo(() => new Vector3(), [])

  useFrame(({ clock }, delta) => {
    const walker = group.current
    if (!walker) return

    const loop = (offset + speed * clock.elapsedTime) % (2 * route.length)
    const forward = loop < route.length
    const distance = forward ? loop : 2 * route.length - loop

    const segment =
      route.segments.find((s) => distance >= s.start && distance <= s.start + s.length) ??
      route.segments.at(-1)
    walker.position.lerpVectors(segment.from, segment.to, (distance - segment.start) / segment.length)

    direction.subVectors(segment.to, segment.from)
    if (!forward) direction.negate()
    const yaw = Math.atan2(direction.x, direction.z)
    const turn = Math.atan2(Math.sin(yaw - walker.rotation.y), Math.cos(yaw - walker.rotation.y))
    walker.rotation.y += turn * Math.min(1, delta * TURN_SPEED)
  })

  return (
    <Character
      ref={group}
      id={id}
      clip={CLIPS.WALK}
      timeScale={timeScale}
      startTime={offset % 1}
    />
  )
}

/** Người đi đường ngoài quán. exclude: id nhân vật không hiện (vd. nhân vật chính của video). */
export default function Passersby({ exclude = [] }) {
  return WALKERS.filter((walker) => !exclude.includes(walker.id)).map((walker) => (
    <Walker key={walker.id} {...walker} />
  ))
}

preloadCharacters(WALKERS.map((walker) => walker.id))

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import Character from '../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../characters/characterAssets.js'
import { findPath } from '../player/nav.js'
import { playerBridge } from '../player/playerBridge.js'
import { useCafeStore } from '../store.js'

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
  { id: 'passerby_backpack', groupKey: 'street', path: STREET, speed: 1.0, offset: 3 },
  { id: 'passerby_office', groupKey: 'street', path: STREET, speed: 1.15, offset: 16 },
  { id: 'passerby_umbrella', groupKey: 'street', path: STREET, speed: 0.8, offset: 25 },
  { id: 'passerby_jogger', groupKey: 'street', path: STREET, speed: 2.3, offset: 9, timeScale: 1.9 },
  { id: 'guest_headphones', groupKey: 'sidewalk', path: SIDEWALK, speed: 0.9, offset: 4 },
  ...(INSIDE ? [{ id: 'barista_2', groupKey: 'inside', indoor: true, path: INSIDE, speed: 0.7, offset: 2 }] : []),
]

const TURN_SPEED = 8
const PASS_RADIUS = 2.4 // m: bắt đầu né sang hai bên khi hai người trên cùng tuyến lại gần nhau
const PLAYER_BUBBLE = 0.95 // m: khoảng cách giữ lịch sự với nhân vật người chơi

const smoothBell = (distance, radius) => {
  if (distance >= radius) return 0
  const t = 1 - distance / radius
  return t * t * (3 - 2 * t)
}

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

function progressAt(route, speed, offset, elapsed) {
  const loop = (offset + speed * elapsed) % (2 * route.length)
  const forward = loop < route.length
  const distance = forward ? loop : 2 * route.length - loop
  const segment =
    route.segments.find((s) => distance >= s.start && distance <= s.start + s.length) ?? route.segments.at(-1)
  return { distance, forward, segment }
}

/**
 * Một người đi qua đi lại trên một đường gấp khúc (đi hết thì quay đầu):
 * - Ngoài phố: hai người đi ngược chiều hoặc vượt nhau tự lách sang phải / trái theo hàm mượt theo đồng hồ
 *   (giữ nguyên tính tất định cho tool quay video).
 * - Trong quán (`indoor`): gặp người chơi đứng chắn lối hẹp thì barista dừng lại nhường đường.
 */
function Walker({ walker, peersOnSameTrack }) {
  const { id, path, speed, offset, timeScale = 1, indoor = false } = walker
  const group = useRef(null)
  const route = useMemo(() => buildSegments(path), [path])
  const direction = useMemo(() => new Vector3(), [])
  const basePos = useMemo(() => new Vector3(), [])
  const pausedTime = useRef(0)
  const lastElapsed = useRef(null)
  const [yielding, setYielding] = useState(false)

  useFrame(({ clock }, delta) => {
    const node = group.current
    if (!node) return

    const dt = Math.min(delta, 0.1)
    const cafeState = useCafeStore.getState()
    const activePlayer = cafeState.entered && !cafeState.seat
    const elapsed = clock.elapsedTime
    if (lastElapsed.current === null || Math.abs(elapsed - lastElapsed.current) > 1) {
      pausedTime.current = 0
    }
    lastElapsed.current = elapsed

    // Trong lối đi hẹp của quán: đứng gần người chơi đang đi bộ thì dừng lại nhường
    if (indoor && activePlayer) {
      const distToPlayer = Math.hypot(node.position.x - playerBridge.x, node.position.z - playerBridge.z)
      const shouldYield = distToPlayer < PLAYER_BUBBLE
      if (shouldYield) pausedTime.current += dt
      if (shouldYield !== yielding) setYielding(shouldYield)
    } else if (yielding) {
      setYielding(false)
    }

    const effectiveTime = Math.max(0, elapsed - pausedTime.current)
    const { distance, forward, segment } = progressAt(route, speed, offset, effectiveTime)
    basePos.lerpVectors(segment.from, segment.to, (distance - segment.start) / segment.length)

    direction.subVectors(segment.to, segment.from).normalize()
    if (!forward) direction.negate()

    // Lách ngang khi tránh người đi cùng tuyến (ngoài phố rộng rãi)
    let lateral = 0
    if (!indoor && peersOnSameTrack.length > 0) {
      for (const other of peersOnSameTrack) {
        const otherProg = progressAt(route, other.speed, other.offset, elapsed)
        const gap = Math.abs(distance - otherProg.distance)
        const w = smoothBell(gap, PASS_RADIUS)
        if (!w) continue
        if (forward !== otherProg.forward) {
          // Ngược chiều: ai cũng nép về bên phải hướng đi của mình
          lateral += 0.28 * w
        } else {
          // Cùng chiều (vượt nhau): người nhanh hơn lách sang trái, người chậm nép sang phải
          lateral += (speed > other.speed || (speed === other.speed && id > other.id) ? -0.3 : 0.22) * w
        }
      }
      lateral = Math.max(-0.48, Math.min(0.48, lateral))
    }

    // Vector bên phải hướng đi trên mặt phẳng XZ: (-dir.z, +dir.x)
    let targetX = basePos.x - direction.z * lateral
    let targetZ = basePos.z + direction.x * lateral

    // Tránh đi xuyên qua người chơi đang đứng ngoài đường / đầu hẻm
    if (!indoor && activePlayer) {
      const dx = targetX - playerBridge.x
      const dz = targetZ - playerBridge.z
      const d = Math.hypot(dx, dz)
      if (d > 0.001 && d < PLAYER_BUBBLE) {
        const push = smoothBell(d, PLAYER_BUBBLE) * (PLAYER_BUBBLE - d)
        targetX += (dx / d) * push
        targetZ += (dz / d) * push
      }
    }

    const moveX = targetX - node.position.x
    const moveZ = targetZ - node.position.z
    node.position.set(targetX, 0, targetZ)

    const heading =
      !yielding && Math.hypot(moveX, moveZ) > 0.002 ? Math.atan2(moveX, moveZ) : Math.atan2(direction.x, direction.z)
    const turn = Math.atan2(Math.sin(heading - node.rotation.y), Math.cos(heading - node.rotation.y))
    node.rotation.y += turn * Math.min(1, dt * TURN_SPEED)
  })

  return (
    <Character
      ref={group}
      id={id}
      clip={yielding ? CLIPS.STAND : CLIPS.WALK}
      timeScale={yielding ? 1 : timeScale}
      startTime={offset % 1}
    />
  )
}

/** Người đi đường ngoài quán và nhân viên đi lại trong quán. */
export default function Passersby({ exclude = [] }) {
  const active = useMemo(() => WALKERS.filter((walker) => !exclude.includes(walker.id)), [exclude])
  return active.map((walker) => (
    <Walker
      key={walker.id}
      walker={walker}
      peersOnSameTrack={active.filter((other) => other.id !== walker.id && other.groupKey === walker.groupKey)}
    />
  ))
}

preloadCharacters(WALKERS.map((walker) => walker.id))

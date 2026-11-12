import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Raycaster, Vector3 } from 'three'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import cafeMeta from '../../assets/cafe/cafe.meta.json'
import Character from '../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../characters/characterAssets.js'
import Laptop from './Laptop.jsx'

// Khách ngồi sẵn trong quán (giống bản thử). seatLift: ghế cao/thấp hơn ghế thường bao nhiêu mét.
// Khách đang gõ phím (TYPE) có laptop đặt trên bàn trước mặt.
const GUESTS = [
  { seat: 'Ban_02', id: 'guest_cardigan', clip: CLIPS.DRINK, seatLift: 0.16, startTime: 0.4 },
  { seat: 'Ban_04', id: 'guest_hoodie', clip: CLIPS.TYPE, seatLift: 0.16, startTime: 1.7 },
  { seat: 'Ban_06', id: 'guest_glasses', clip: CLIPS.TYPE, seatLift: 0, startTime: 0.9 },
  { seat: 'Ban_08', id: 'guest_overalls', clip: CLIPS.DRINK, seatLift: 0, startTime: 2.9 },
  { seat: 'Ban_09', id: 'guest_sweater', clip: CLIPS.DRINK, seatLift: -0.08, startTime: 1.2 },
  { seat: 'Ban_12', id: 'guest_headphones', clip: CLIPS.DRINK, seatLift: 0, startTime: 2.2 },
  { seat: 'Ban_16', id: 'passerby_backpack', clip: CLIPS.TYPE, seatLift: 0, startTime: 0.3 },
  { seat: 'Ban_19', id: 'guest_cardigan', clip: CLIPS.TYPE, seatLift: 0, startTime: 1.5 },
  { seat: 'Ban_22', id: 'guest_hoodie', clip: CLIPS.TYPE, seatLift: 0.02, startTime: 2.6 },
  { seat: 'Ban_26', id: 'passerby_office', clip: CLIPS.TYPE, seatLift: 0, startTime: 0.7 },
  { seat: 'Ban_28', id: 'guest_overalls', clip: CLIPS.DRINK, seatLift: -0.08, startTime: 1.9 },
]

// Barista đứng sau quầy
const STAFF = [
  { id: 'barista_1', position: [-1.8, 0.45, -2.55], yaw: 0, timeScale: 1 },
  { id: 'barista_2', position: [-0.65, 0.45, -2.55], yaw: 0.2, timeScale: 0.85 },
]

// Cách đặt nhân vật lên ghế, giống bản thử
const SEAT_HEIGHT = 0.46
const HIP_OFFSET = 0.47 * 0.65 - 0.02 // từ chân nhân vật tới mông, đã nhân tỉ lệ nhân vật
const LEAN_FORWARD = 0.06
const LAPTOP_DISTANCE = 0.42 // từ đầu người ngồi tới giữa laptop
const DEFAULT_TABLE_HEIGHT = 0.74

const SEATS = Object.fromEntries(cafeMeta.seats.map((seat) => [seat.n, seat]))

function seatYaw(seat) {
  const { c: head, l: look } = SEATS[seat]
  return Math.atan2(look[0] - head[0], look[2] - head[2])
}

function seatPose({ seat, seatLift }) {
  const head = SEATS[seat].c
  const yaw = seatYaw(seat)
  return {
    position: [
      head[0] + Math.sin(yaw) * LEAN_FORWARD,
      SEAT_HEIGHT + seatLift - HIP_OFFSET,
      head[2] + Math.cos(yaw) * LEAN_FORWARD,
    ],
    rotation: [0, yaw, 0],
  }
}

/** Độ cao mặt bàn tại (x, z): bắn tia từ trên xuống, lấy mặt nằm ngang đầu tiên. */
function tableHeight(cafe, raycaster, x, z) {
  raycaster.set(new Vector3(x, 1.45, z), new Vector3(0, -1, 0))
  for (const hit of raycaster.intersectObject(cafe, true)) {
    if (!hit.face) continue
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    if (Math.abs(normal.y) > 0.85 && hit.point.y > 0.3 && hit.point.y < 1.15) return hit.point.y
  }
  return DEFAULT_TABLE_HEIGHT
}

function useLaptopPoses(guests) {
  const { scene: cafe } = useGLTF(cafeUrl)

  return useMemo(() => {
    cafe.updateMatrixWorld(true)
    const raycaster = new Raycaster()
    return guests
      .filter((guest) => guest.clip === CLIPS.TYPE)
      .map(({ seat }) => {
        const head = SEATS[seat].c
        const yaw = seatYaw(seat)
        const x = head[0] + Math.sin(yaw) * LAPTOP_DISTANCE
        const z = head[2] + Math.cos(yaw) * LAPTOP_DISTANCE
        return {
          seat,
          position: [x, tableHeight(cafe, raycaster, x, z), z],
          rotation: [0, yaw + Math.PI, 0], // màn hình quay về phía người ngồi
        }
      })
  }, [cafe, guests])
}

export default function Guests() {
  const laptops = useLaptopPoses(GUESTS)

  return (
    <>
      {GUESTS.map((guest) => (
        <Character
          key={guest.seat}
          id={guest.id}
          clip={guest.clip}
          startTime={guest.startTime}
          {...seatPose(guest)}
        />
      ))}
      {laptops.map(({ seat, ...pose }) => (
        <Laptop key={`laptop-${seat}`} {...pose} />
      ))}
      {STAFF.map((barista) => (
        <Character
          key={barista.id}
          id={barista.id}
          clip={CLIPS.BREW}
          timeScale={barista.timeScale}
          position={barista.position}
          rotation={[0, barista.yaw, 0]}
        />
      ))}
    </>
  )
}

preloadCharacters([...GUESTS, ...STAFF].map((person) => person.id))

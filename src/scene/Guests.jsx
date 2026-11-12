import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import Character from '../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../characters/characterAssets.js'
import Laptop from './Laptop.jsx'
import { laptopPoses, seatPose } from './seating.js'

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

const TYPING_SEATS = GUESTS.filter((guest) => guest.clip === CLIPS.TYPE).map((guest) => guest.seat)

/** Khách và nhân viên trong quán. exclude: id nhân vật không hiện (vd. nhân vật chính của video). */
export default function Guests({ exclude = [] }) {
  const { scene: cafe } = useGLTF(cafeUrl)
  const laptops = useMemo(() => laptopPoses(cafe, TYPING_SEATS), [cafe])
  const guests = GUESTS.filter((guest) => !exclude.includes(guest.id))

  return (
    <>
      {guests.map((guest) => (
        <Character
          key={guest.seat}
          id={guest.id}
          clip={guest.clip}
          startTime={guest.startTime}
          {...seatPose(guest.seat, guest.seatLift)}
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

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import Character from '../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../characters/characterAssets.js'
import { useNetStore } from '../net/netStore.js'
import { useCafeStore } from '../store.js'
import { GUESTS, STAFF, visibleGuests } from './guestList.js'
import Laptop from './Laptop.jsx'
import { laptopPoses, seatPose } from './seating.js'

/**
 * Khách và nhân viên trong quán.
 * `exclude`: id nhân vật không hiện (vd. nhân vật người chơi).
 * Ngoài ra, ghế nào đang có người chơi thật ngồi (mình hoặc bạn cùng phòng) thì ẩn khách NPC ở ghế đó
 * để hai người không bao giờ ngồi chồng lên nhau.
 */
export default function Guests({ exclude = [] }) {
  const { scene: cafe } = useGLTF(cafeUrl)
  const mySeat = useCafeStore((state) => state.seat)
  const peerSeatsKey = useNetStore((state) =>
    Object.values(state.peers)
      .map((peer) => peer.seat)
      .filter(Boolean)
      .sort()
      .join(','),
  )

  const guests = useMemo(() => {
    const humanSeats = new Set(peerSeatsKey ? peerSeatsKey.split(',') : [])
    if (mySeat) humanSeats.add(mySeat)
    return visibleGuests(exclude).filter((guest) => !humanSeats.has(guest.seat))
  }, [exclude, mySeat, peerSeatsKey])

  const laptops = useMemo(
    () => laptopPoses(cafe, guests.filter((guest) => guest.clip === CLIPS.TYPE).map((guest) => guest.seat)),
    [cafe, guests],
  )

  return (
    <>
      {guests.map((guest) => (
        <Character key={guest.seat} id={guest.id} clip={guest.clip} startTime={guest.startTime} castShadow={false} {...seatPose(guest.seat)} />
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
          castShadow={false}
        />
      ))}
    </>
  )
}

preloadCharacters([...GUESTS, ...STAFF].map((person) => person.id))

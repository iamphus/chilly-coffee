// Khách ngồi sẵn và nhân viên trong quán (giống bản thử). Dùng chung cho Guests.jsx (vẽ)
// và cho người chơi (biết ghế nào đang có người, không ngồi được).
import { CLIPS } from '../characters/characterAssets.js'

// Khách đang gõ phím (TYPE) có laptop đặt trên bàn trước mặt
export const GUESTS = [
  { seat: 'Ban_02', id: 'guest_cardigan', clip: CLIPS.DRINK, startTime: 0.4 },
  { seat: 'Ban_04', id: 'guest_hoodie', clip: CLIPS.TYPE, startTime: 1.7 },
  { seat: 'Ban_06', id: 'guest_glasses', clip: CLIPS.TYPE, startTime: 0.9 },
  { seat: 'Ban_08', id: 'guest_overalls', clip: CLIPS.DRINK, startTime: 2.9 },
  { seat: 'Ban_09', id: 'guest_sweater', clip: CLIPS.DRINK, startTime: 1.2 },
  { seat: 'Ban_12', id: 'guest_headphones', clip: CLIPS.DRINK, startTime: 2.2 },
  { seat: 'Ban_16', id: 'passerby_backpack', clip: CLIPS.TYPE, startTime: 0.3 },
  { seat: 'Ban_19', id: 'guest_cardigan', clip: CLIPS.TYPE, startTime: 1.5 },
  { seat: 'Ban_22', id: 'guest_hoodie', clip: CLIPS.TYPE, startTime: 2.6 },
  { seat: 'Ban_26', id: 'passerby_office', clip: CLIPS.TYPE, startTime: 0.7 },
  { seat: 'Ban_28', id: 'guest_overalls', clip: CLIPS.DRINK, startTime: 1.9 },
]

// Barista đứng pha chế sau quầy (barista_2 đi lại phục vụ trong quán, xem Passersby.jsx)
export const STAFF = [{ id: 'barista_1', position: [-1.8, 0.45, -2.55], yaw: 0, timeScale: 1 }]

/** Khách còn hiện trong quán khi bỏ đi các nhân vật trong `exclude` (vd. nhân vật người chơi). */
export const visibleGuests = (exclude) => GUESTS.filter((guest) => !exclude.includes(guest.id))

/** Các bàn đang có khách ngồi. */
export const occupiedSeats = (exclude) => new Set(visibleGuests(exclude).map((guest) => guest.seat))

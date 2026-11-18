// Mã phòng cho tính năng phòng riêng / link mời (?room=bac-xiu-418).
export const PUBLIC_ROOMS = ['02', '03', '04', '05', '06']

const PREFIXES = ['bac-xiu', 'ca-phe', 'matcha', 'latte', 'moka', 'tra-dao', 'mua-bay', 'goc-nho']

/** Chuẩn hoá mã phòng người dùng nhập hoặc lấy từ URL: chữ thường không dấu, số và gạch ngang (2–20 ký tự). */
export function sanitizeRoomCode(raw) {
  const slug = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .replace(/-+$/g, '')
  return slug.length >= 2 ? slug : null
}

export const isPrivateRoom = (room) => Boolean(room) && !PUBLIC_ROOMS.includes(room)

/** Đọc mã phòng từ ?room=… khi mới mở trang. */
export function readRoomFromUrl() {
  try {
    const value = new URLSearchParams(window.location.search).get('room')
    return value ? sanitizeRoomCode(value) : null
  } catch {
    return null
  }
}

/** Ghi mã phòng lên thanh địa chỉ (không tải lại trang) để F5 vẫn ở đúng phòng. */
export function writeRoomToUrl(room) {
  try {
    const url = new URL(window.location.href)
    if (room) url.searchParams.set('room', room)
    else url.searchParams.delete('room')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    // môi trường không cho đổi history thì bỏ qua
  }
}

export function generatePrivateRoom() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
  const digits = 100 + Math.floor(Math.random() * 900)
  return `${prefix}-${digits}`
}

export function buildInviteUrl(room) {
  const code = sanitizeRoomCode(room) ?? PUBLIC_ROOMS[0]
  return `${window.location.origin}/?room=${encodeURIComponent(code)}`
}

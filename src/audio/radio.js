// Nhạc quán phát như một đài radio đồng bộ theo đồng hồ: coi danh sách bài là một đài đã phát liên tục
// từ mốc EPOCH, nên mọi máy cùng nghe một bài, cùng một giây — không cần server riêng.
// Để tránh lệch khi đồng hồ máy người dùng chạy sai, lấy giờ chuẩn từ header `Date` của chính trang web.
import { TRACKS } from './tracks.js'

const EPOCH = Date.UTC(2026, 0, 1) / 1000 // giây
const RESYNC_EVERY_MS = 30_000
const MAX_DRIFT = 2.5 // giây: lệch hơn thì nhảy về đúng chỗ

function loadDuration(url) {
  return new Promise((resolve) => {
    const probe = new Audio()
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => resolve(probe.duration)
    probe.onerror = () => resolve(0) // không đọc được (trình duyệt không hỗ trợ định dạng) thì bỏ bài này
    probe.src = url
  })
}

/** Độ lệch (giây) giữa giờ server (header HTTP Date) và đồng hồ máy. Không đọc được thì dùng 0. */
async function fetchClockOffset() {
  try {
    const sentAt = Date.now()
    const response = await fetch(window.location.origin + '/', { method: 'HEAD', cache: 'no-store' })
    const receivedAt = Date.now()
    const raw = response.headers.get('date')
    if (!raw) return 0
    const serverMs = Date.parse(raw)
    if (!Number.isFinite(serverMs)) return 0
    const localMidMs = (sentAt + receivedAt) / 2
    const diffSec = (serverMs - localMidMs) / 1000
    // Nếu lệch dưới 1.5 giây thì coi như đồng hồ máy đã chuẩn (bỏ qua độ trễ làm tròn 1 giây của HTTP Date)
    return Math.abs(diffSec) < 1.5 ? 0 : diffSec
  } catch {
    return 0
  }
}

export class Radio {
  constructor(onTrackChange) {
    this.element = new Audio()
    this.element.preload = 'auto'
    this.onTrackChange = onTrackChange
    this.tracks = []
    this.current = -1
    this.clockOffset = 0
    this.timer = null
    this.element.addEventListener('ended', () => this.sync(true))
  }

  /** Đọc thời lượng các bài và giờ chuẩn server. Trả về false nếu không có bài nào. */
  async prepare() {
    const [durations, offset] = await Promise.all([
      Promise.all(TRACKS.map((track) => loadDuration(track.url))),
      fetchClockOffset(),
    ])
    this.clockOffset = offset
    this.tracks = TRACKS.map((track, i) => ({ ...track, duration: durations[i] })).filter((track) => track.duration > 0)
    this.total = this.tracks.reduce((sum, track) => sum + track.duration, 0)
    return this.tracks.length > 0
  }

  /** Bài và giây đang phát theo đồng hồ đã bù độ lệch. */
  position(now = Date.now() / 1000 + this.clockOffset) {
    let offset = (((now - EPOCH) % this.total) + this.total) % this.total
    for (let i = 0; i < this.tracks.length; i++) {
      if (offset < this.tracks[i].duration) return { index: i, offset }
      offset -= this.tracks[i].duration
    }
    return { index: 0, offset: 0 }
  }

  /** Đưa trình phát về đúng bài, đúng giây; force = luôn nhảy (vd. vừa hết bài). */
  sync(force = false) {
    if (!this.tracks.length) return
    const { index, offset } = this.position()
    const element = this.element
    if (index !== this.current) {
      this.current = index
      element.src = this.tracks[index].url
      element.currentTime = offset
      this.onTrackChange?.(this.tracks[index])
    } else if (force || Math.abs(element.currentTime - offset) > MAX_DRIFT) {
      element.currentTime = offset
    }
    element.play().catch(() => {}) // bị chặn tự phát thì lần đồng bộ sau thử lại
  }

  start() {
    this.sync(true)
    clearInterval(this.timer)
    this.timer = setInterval(() => this.sync(), RESYNC_EVERY_MS)
  }

  stop() {
    clearInterval(this.timer)
    this.element.pause()
  }
}

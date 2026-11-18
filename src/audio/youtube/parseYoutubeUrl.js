// Đọc link YouTube người dùng dán vào app "Nhạc riêng" trên laptop.
// Nhận: youtube.com/playlist?list=…, youtube.com/watch?v=…(&list=…), youtu.be/…, /shorts/, /embed/, /live/,
// music.youtube.com, m.youtube.com.
// Lưu ý quan trọng: YouTube tự gắn `&list=RD…` (Mix tự động) hoặc `WL`/`LL`/`LM` (Xem sau / Đã thích riêng tư)
// vào rất nhiều link bài hát — trình phát nhúng của YouTube KHÔNG phát được các danh sách này (sẽ quay vòng vô tận).
// Vì vậy chỉ nhận `list` là playlist nhúng được khi thuộc dạng danh sách công khai (`PL…`, `OLAK5uy_…`, `UU…`, `FL…`),
// còn lại tự ưu tiên phát theo mã `videoId`.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const LIST_ID = /^[A-Za-z0-9_-]{2,64}$/
const EMBEDDABLE_LIST = /^(PL|OLAK5uy_|UU|FL)[A-Za-z0-9_-]+$/
const MIX_WITH_VIDEO = /^(?:RD(?:AMVM|MM|CM|CLAK5uy_)?|UL)([A-Za-z0-9_-]{11})$/

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])
const PATH_PREFIXES = ['/shorts/', '/embed/', '/live/', '/v/']

/** Chuẩn hoá nguồn đã lưu (tự cứu các link Mix `RD…` cũ trong localStorage thành video đơn). */
export function normalizeYoutubeSource(source) {
  if (!source || typeof source.id !== 'string') return null
  if (source.type === 'video') {
    return VIDEO_ID.test(source.id) ? { type: 'video', id: source.id } : null
  }
  if (source.type === 'playlist') {
    if (EMBEDDABLE_LIST.test(source.id)) return { type: 'playlist', id: source.id }
    const mixMatch = source.id.match(MIX_WITH_VIDEO)
    if (mixMatch && VIDEO_ID.test(mixMatch[1])) return { type: 'video', id: mixMatch[1] }
  }
  return null
}

/** @returns {{ type: 'playlist' | 'video', id: string } | null} */
export function parseYoutubeUrl(input) {
  const text = String(input ?? '').trim()
  if (!text) return null

  let url
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  let videoId
  if (host === 'youtu.be') {
    videoId = url.pathname.slice(1).split('/')[0]
  } else if (HOSTS.has(host)) {
    videoId = url.searchParams.get('v')
    const prefix = PATH_PREFIXES.find((item) => url.pathname.startsWith(item))
    if (!videoId && prefix) {
      const candidate = url.pathname.slice(prefix.length).split('/')[0]
      if (candidate !== 'videoseries') videoId = candidate
    }
  } else {
    return null
  }

  const listId = url.searchParams.get('list')
  if (listId && LIST_ID.test(listId) && EMBEDDABLE_LIST.test(listId)) {
    return { type: 'playlist', id: listId }
  }
  if (videoId && VIDEO_ID.test(videoId)) {
    return { type: 'video', id: videoId }
  }
  if (listId) {
    const mixMatch = listId.match(MIX_WITH_VIDEO)
    if (mixMatch && VIDEO_ID.test(mixMatch[1])) return { type: 'video', id: mixMatch[1] }
  }
  return null
}

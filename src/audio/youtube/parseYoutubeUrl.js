// Đọc link YouTube người dùng dán vào app "Nhạc riêng" trên laptop.
// Nhận: youtube.com/playlist?list=…, youtube.com/watch?v=…(&list=…), youtu.be/…, /shorts/, /embed/, /live/,
// music.youtube.com, m.youtube.com. Có `list` thì ưu tiên phát cả playlist.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const LIST_ID = /^[A-Za-z0-9_-]{2,64}$/
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const PATH_PREFIXES = ['/shorts/', '/embed/', '/live/', '/v/']

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
    if (!videoId && prefix) videoId = url.pathname.slice(prefix.length).split('/')[0]
  } else {
    return null
  }

  const listId = url.searchParams.get('list')
  if (listId && LIST_ID.test(listId)) return { type: 'playlist', id: listId }
  if (videoId && VIDEO_ID.test(videoId)) return { type: 'video', id: videoId }
  return null
}

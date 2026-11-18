// Nạp YouTube IFrame Player API (chính thức) một lần, chỉ khi người dùng đã dán link nhạc riêng.
const API_URL = 'https://www.youtube.com/iframe_api'
const TIMEOUT_MS = 10_000
let pending = null

/** @returns {Promise<typeof window.YT>} */
export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn, arg) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      clearTimeout(timeout)
      fn(arg)
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT?.Player) finish(resolve, window.YT)
    }

    // Dự phòng nếu callback toàn cục đã chạy trước hoặc bị tiện ích trình duyệt ghi đè
    const poll = setInterval(() => {
      if (window.YT?.Player) finish(resolve, window.YT)
    }, 120)

    const timeout = setTimeout(() => {
      pending = null
      finish(reject, new Error('YOUTUBE_API_TIMEOUT'))
    }, TIMEOUT_MS)

    const existing = document.querySelector(`script[src="${API_URL}"]`)
    if (!existing) {
      const script = document.createElement('script')
      script.src = API_URL
      script.async = true
      script.onerror = () => {
        pending = null // lần sau thử lại (mạng chập chờn, trình chặn quảng cáo…)
        script.remove()
        finish(reject, new Error('YOUTUBE_API_LOAD_FAILED'))
      }
      document.head.appendChild(script)
    }
  })
  return pending
}

// Nạp YouTube IFrame Player API (chính thức) một lần, chỉ khi người dùng đã dán link nhạc riêng.
const API_URL = 'https://www.youtube.com/iframe_api'
let pending = null

/** @returns {Promise<typeof window.YT>} */
export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = API_URL
    script.async = true
    script.onerror = () => {
      pending = null // lần sau thử lại (mạng chập chờn, trình chặn quảng cáo…)
      script.remove()
      reject(new Error('YOUTUBE_API_LOAD_FAILED'))
    }
    document.head.appendChild(script)
  })
  return pending
}

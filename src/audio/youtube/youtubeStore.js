import { create } from 'zustand'

// Nhạc riêng (YouTube) trên laptop: link đang dùng và chỗ đang nghe dở. Lưu localStorage, không gửi đi đâu.
const STORAGE_KEY = 'chilly.youtube'
const START = { index: 0, time: 0 }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const source = saved?.source
    if (!source || !['playlist', 'video'].includes(source.type) || typeof source.id !== 'string') return { source: null, resume: START }
    const index = Number.isInteger(saved.resume?.index) && saved.resume.index >= 0 ? saved.resume.index : 0
    const time = Number.isFinite(saved.resume?.time) && saved.resume.time >= 0 ? saved.resume.time : 0
    return { source, resume: { index, time } }
  } catch {
    return { source: null, resume: START }
  }
}

function save({ source, resume }) {
  try {
    if (source) localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, resume }))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // không lưu được (chế độ ẩn danh…) thì chỉ giữ trong phiên này
  }
}

export const useYoutubeStore = create((set, get) => ({
  ...load(),

  /** source: { type: 'playlist' | 'video', id } (từ parseYoutubeUrl) */
  setSource: (source) => {
    set({ source, resume: START })
    save(get())
  },
  clearSource: () => {
    set({ source: null, resume: START })
    save(get())
  },
  /** Ghi lại bài và giây đang nghe khi gập laptop, để lần sau nghe tiếp. */
  saveResume: (resume) => {
    set({ resume })
    save(get())
  },
}))

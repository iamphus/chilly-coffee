import { create } from 'zustand'

// Pomodoro, lịch sử tập trung theo ngày, việc cần làm và ghi chú trên laptop. Lưu vào localStorage.
// Đồng hồ tính theo thời điểm kết thúc (endsAt) chứ không đếm từng giây, nên ẩn tab hay tải lại trang vẫn đúng.
const STORAGE_KEY = 'chilly.focus'
const MINUTE = 60_000
const MAX_HISTORY_DAYS = 60
export const DURATION_LIMITS = { min: 1, max: 120 }

/** Ngày theo múi giờ máy người dùng (YYYY-MM-DD), không dùng UTC để nửa đêm giờ Việt Nam đổi ngày đúng lúc. */
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function pruneHistory(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries = Object.entries(raw)
    .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && v && Number(v.count) > 0)
    .map(([k, v]) => [k, { count: Math.round(Number(v.count)), minutes: Math.max(0, Math.round(Number(v.minutes) || 0)) }])
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-MAX_HISTORY_DAYS)
  return Object.fromEntries(entries)
}

const DEFAULTS = {
  focusMinutes: 25,
  breakMinutes: 5,
  mode: 'focus', // 'focus' | 'break'
  running: false,
  endsAt: null, // ms (Date.now()) khi đang chạy
  remaining: 25 * MINUTE, // ms còn lại khi đang dừng
  completedToday: 0,
  completedDate: dateKey(),
  history: {}, // 'YYYY-MM-DD' → { count, minutes }
  todos: [], // { id, text, done }
  notes: '',
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return DEFAULTS
    const nowDay = dateKey()
    const history = pruneHistory(saved.history)
    // Giữ lại kết quả từ bản cũ (chưa có trường history)
    if (saved.completedDate && Number(saved.completedToday) > 0 && !history[saved.completedDate]) {
      const count = Math.round(Number(saved.completedToday))
      history[saved.completedDate] = { count, minutes: count * (Number(saved.focusMinutes) || 25) }
    }
    const state = { ...DEFAULTS, ...saved, history }
    if (state.completedDate !== nowDay) {
      state.completedToday = history[nowDay]?.count ?? 0
      state.completedDate = nowDay
    }
    return state
  } catch {
    return DEFAULTS
  }
}

const PERSISTED = Object.keys(DEFAULTS)
function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(PERSISTED.map((key) => [key, state[key]]))))
  } catch {
    // không lưu được (chế độ ẩn danh…) thì chỉ giữ trong phiên này
  }
}

const durationOf = (state, mode) => (mode === 'focus' ? state.focusMinutes : state.breakMinutes) * MINUTE
const clampMinutes = (value) =>
  Math.min(DURATION_LIMITS.max, Math.max(DURATION_LIMITS.min, Math.round(Number(value) || DURATION_LIMITS.min)))

/** Số ms còn lại của lượt hiện tại. */
export const remainingMs = (state, now = Date.now()) =>
  state.running ? Math.max(0, state.endsAt - now) : state.remaining

/** Mảng `days` ngày gần nhất (từ cũ tới hôm nay) để vẽ biểu đồ tuần. */
export function recentDays(history = {}, days = 7, now = new Date()) {
  const todayKey = dateKey(now)
  const out = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const key = dateKey(d)
    const entry = history[key]
    out.push({
      key,
      date: d,
      count: entry?.count ?? 0,
      minutes: entry?.minutes ?? 0,
      isToday: key === todayKey,
    })
  }
  return out
}

/** Số ngày liên tiếp có ít nhất 1 Pomodoro (tính tới hôm nay, hoặc tới hôm qua nếu hôm nay chưa xong phiên nào). */
export function focusStreak(history = {}, now = new Date()) {
  let streak = 0
  const startOffset = (history[dateKey(now)]?.count ?? 0) > 0 ? 0 : 1
  for (let offset = startOffset; offset <= MAX_HISTORY_DAYS; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    if ((history[dateKey(d)]?.count ?? 0) > 0) streak += 1
    else break
  }
  return streak
}

export const useFocusStore = create((set, get) => ({
  ...load(),

  start: () => {
    const state = get()
    set({ running: true, endsAt: Date.now() + state.remaining })
  },
  pause: () => set((state) => ({ running: false, remaining: remainingMs(state), endsAt: null })),
  reset: () => set((state) => ({ running: false, endsAt: null, remaining: durationOf(state, state.mode) })),
  /** Bỏ qua lượt hiện tại, chuyển sang lượt kia (chưa chạy). */
  skip: () =>
    set((state) => {
      const mode = state.mode === 'focus' ? 'break' : 'focus'
      return { mode, running: false, endsAt: null, remaining: durationOf(state, mode) }
    }),
  /**
   * Hết giờ: hết lượt tập trung thì cộng 1 Pomodoro (vào cả hôm nay lẫn lịch sử) và tự chạy giờ nghỉ;
   * hết giờ nghỉ thì chờ người dùng bấm bắt đầu lượt mới. Trả về lượt vừa xong.
   */
  complete: () => {
    const state = get()
    const finished = state.mode
    if (finished === 'focus') {
      const breakMs = durationOf(state, 'break')
      const day = dateKey()
      const sameDay = state.completedDate === day
      const completedToday = (sameDay ? state.completedToday : 0) + 1
      const prev = state.history?.[day] ?? { count: 0, minutes: 0 }
      const history = pruneHistory({
        ...state.history,
        [day]: { count: Math.max(completedToday, prev.count + 1), minutes: prev.minutes + state.focusMinutes },
      })
      set({
        mode: 'break',
        running: true,
        endsAt: Date.now() + breakMs,
        remaining: breakMs,
        completedToday,
        completedDate: day,
        history,
      })
    } else {
      set({ mode: 'focus', running: false, endsAt: null, remaining: durationOf(state, 'focus') })
    }
    return finished
  },
  setDurations: (focusMinutes, breakMinutes) =>
    set((state) => {
      const next = { focusMinutes: clampMinutes(focusMinutes), breakMinutes: clampMinutes(breakMinutes) }
      // Đang dừng thì cập nhật luôn thời gian còn lại của lượt hiện tại
      return state.running ? next : { ...next, remaining: durationOf({ ...state, ...next }, state.mode) }
    }),

  addTodo: (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    set((state) => ({ todos: [...state.todos, { id: crypto.randomUUID(), text: trimmed, done: false }] }))
  },
  toggleTodo: (id) =>
    set((state) => ({ todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)) })),
  removeTodo: (id) => set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) })),
  setNotes: (notes) => set({ notes }),
}))

useFocusStore.subscribe(save)

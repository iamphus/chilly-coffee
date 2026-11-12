import { create } from 'zustand'

// Pomodoro, việc cần làm và ghi chú trên laptop. Lưu vào localStorage để lần sau vào quán vẫn còn.
// Đồng hồ tính theo thời điểm kết thúc (endsAt) chứ không đếm từng giây, nên ẩn tab hay tải lại trang vẫn đúng.
const STORAGE_KEY = 'chilly.focus'
const MINUTE = 60_000
export const DURATION_LIMITS = { min: 1, max: 120 }

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULTS = {
  focusMinutes: 25,
  breakMinutes: 5,
  mode: 'focus', // 'focus' | 'break'
  running: false,
  endsAt: null, // ms (Date.now()) khi đang chạy
  remaining: 25 * MINUTE, // ms còn lại khi đang dừng
  completedToday: 0,
  completedDate: today(),
  todos: [], // { id, text, done }
  notes: '',
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return DEFAULTS
    const state = { ...DEFAULTS, ...saved }
    if (state.completedDate !== today()) Object.assign(state, { completedToday: 0, completedDate: today() })
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
   * Hết giờ: hết lượt tập trung thì cộng 1 Pomodoro và tự chạy giờ nghỉ;
   * hết giờ nghỉ thì chờ người dùng bấm bắt đầu lượt mới. Trả về lượt vừa xong.
   */
  complete: () => {
    const state = get()
    const finished = state.mode
    if (finished === 'focus') {
      const breakMs = durationOf(state, 'break')
      const sameDay = state.completedDate === today()
      set({
        mode: 'break',
        running: true,
        endsAt: Date.now() + breakMs,
        remaining: breakMs,
        completedToday: (sameDay ? state.completedToday : 0) + 1,
        completedDate: today(),
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

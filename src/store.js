import { create } from 'zustand'

/**
 * Trạng thái chung của quán, dùng chung giữa cảnh 3D, giao diện laptop và âm thanh.
 * Các tính năng sau (chọn bàn, tai nghe…) đọc và ghi qua đây thay vì truyền props qua nhiều tầng.
 */
export const useCafeStore = create((set) => ({
  seat: null, // tên bàn đang ngồi, ví dụ 'Ban_07'; null = đang đi dạo / nhìn toàn cảnh
  headphones: false,

  sitDown: (seat) => set({ seat }),
  standUp: () => set({ seat: null }),
  toggleHeadphones: () => set((state) => ({ headphones: !state.headphones })),
}))

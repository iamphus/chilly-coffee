import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Chỉ quét app chính. Các trang trong prototype/ và tools/ dùng three r149 qua importmap,
    // để Vite quét sẽ báo lỗi import.
    entries: ['index.html'],
  },
})

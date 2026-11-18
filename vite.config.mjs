import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { glbMeshoptPlugin } from './tools/viteGlbMeshopt.mjs'

export default defineConfig({
  plugins: [react(), glbMeshoptPlugin()],
  optimizeDeps: {
    // Chỉ quét app chính và trang quay video. Các trang khác trong prototype/ và tools/
    // dùng three r149 qua importmap, để Vite quét sẽ báo lỗi import.
    entries: ['index.html', 'tools/render-video/index.html'],
  },
})

// Dùng chung cho React.lazy (App) và tải trước khi rảnh (Landing), để chỉ tải chunk 3D một lần.
// Import module này cũng bắt đầu tải mô hình quán và nhân vật (useGLTF.preload ở các file scene).
export const loadCafeCanvas = () => import('./CafeCanvas.jsx')

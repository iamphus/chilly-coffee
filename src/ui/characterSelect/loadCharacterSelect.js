// Dùng chung cho React.lazy (App) và tải trước khi rảnh (Landing).
// Import module này cũng bắt đầu tải mô hình các nhân vật chọn được.
export const loadCharacterSelect = () => import('./CharacterSelect.jsx')

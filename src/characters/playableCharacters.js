// Nhân vật người chơi chọn được ở màn chọn nhân vật (theo thứ tự hiển thị).
// Barista là nhân viên quán nên không có trong danh sách.
export const PLAYABLE_CHARACTERS = [
  'guest_headphones',
  'guest_hoodie',
  'guest_cardigan',
  'guest_overalls',
  'guest_sweater',
  'guest_glasses',
  'passerby_backpack',
  'passerby_office',
  'passerby_umbrella',
  'passerby_jogger',
]

export const DEFAULT_CHARACTER = PLAYABLE_CHARACTERS[0]

// Màu áo chính của từng nhân vật, cho chấm màu ở góc màn hình
export const CHARACTER_COLORS = {
  guest_headphones: '#f2a7bb',
  guest_hoodie: '#8fd6b6',
  guest_cardigan: '#f4dccf',
  guest_overalls: '#3f7fd0',
  guest_sweater: '#c3b4ec',
  guest_glasses: '#ece8df',
  passerby_backpack: '#4a90d9',
  passerby_office: '#f6f6f2',
  passerby_umbrella: '#ff7a3d',
  passerby_jogger: '#86d160',
}

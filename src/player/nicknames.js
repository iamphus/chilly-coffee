// Tên hiển thị ngẫu nhiên trên đầu nhân vật (bảng tên), kiểu tên gọi nhẹ nhàng.
export const NICKNAMES = [
  'Mây Chiều',
  'Gió Nhẹ',
  'Nắng Sớm',
  'Mưa Phùn',
  'Lá Thu',
  'Sương Mai',
  'Trăng Non',
  'Hạt Mưa',
  'Bình Minh',
  'Hoàng Hôn',
  'Sao Khuya',
  'Cỏ May',
  'Hoa Sữa',
  'Gió Bấc',
  'Mây Trắng',
  'Nắng Hạ',
]

export const randomNickname = () => NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]

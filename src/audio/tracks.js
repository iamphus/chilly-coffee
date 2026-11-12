// Danh sách nhạc quán: mọi file trong assets/music/ (sắp theo tên). Không có file thì quán không có nhạc.
const FILES = import.meta.glob('../../assets/music/*.{m4a,mp3,ogg,opus,webm}', {
  query: '?url',
  import: 'default',
  eager: true,
})

// Tên bài, tác giả, giấy phép theo tên file (bắt buộc với nhạc CC BY: hiện "Đang phát: …").
// Ví dụ: '1.m4a': { title: 'Rainy Window', artist: 'Ai đó', license: 'CC BY 4.0', link: 'https://…' }
const TRACK_INFO = {
  // 4 bài tự tạo bằng AI (xem assets/music/README.md); đặt tên ở đây để hiện trên nút "Nhạc quán"
}

export const TRACKS = Object.entries(FILES)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, url], index) => {
    const file = path.split('/').pop()
    return { file, url, index, ...TRACK_INFO[file] }
  })

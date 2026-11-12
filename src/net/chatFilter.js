// Lọc chat tự do: cắt độ dài, bỏ ký tự điều khiển / ký tự ẩn, che từ tục và giới hạn tốc độ gửi.
// Đây là lớp chặn cơ bản phía trình duyệt; người dùng còn có nút "Chặn" để ẩn hẳn một người.
export const MAX_CHAT_LENGTH = 160
const MIN_GAP_MS = 1200 // tối thiểu giữa 2 tin
const BURST = { count: 5, windowMs: 15_000 } // tối đa 5 tin trong 15 giây

// Chỉ che khi là nguyên từ / cụm từ. Không so khớp sau khi bỏ dấu, vì nhiều chữ bình thường khi bỏ dấu
// trùng với từ tục ("lớn", "các", "buổi", "đeo"…). Vì vậy:
// - từ có dấu: khớp đúng dạng có dấu
// - từ không dấu: chỉ những từ viết tắt / tiếng Anh không nhập nhằng với chữ thường
const BANNED = [
  // tiếng Việt có dấu
  'địt', 'đéo', 'đụ', 'đụ má', 'đụ mẹ', 'địt mẹ', 'lồn', 'buồi', 'cặc', 'đĩ', 'óc chó', 'thằng chó', 'con chó', 'vãi lồn',
  // viết tắt / không dấu không nhập nhằng
  'dm', 'dmm', 'dcm', 'dkm', 'dmcs', 'đm', 'đmm', 'vcl', 'vkl', 'vl', 'clm', 'cmm', 'dit me', 'dit cu', 'du ma', 'du me', 'oc cho',
  // tiếng Anh
  'fuck', 'fucking', 'fck', 'fuk', 'shit', 'bitch', 'dick', 'pussy', 'cunt', 'asshole', 'bastard', 'slut', 'whore', 'nigger', 'nigga', 'faggot',
]

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
const PATTERN = new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'giu')

/** Làm sạch tin nhắn trước khi gửi và khi nhận. Trả về '' nếu không còn gì. */
export function cleanMessage(raw) {
  const text = String(raw ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_LENGTH)
  return text.replace(PATTERN, (word) => word.replace(/[^\s]/gu, '*'))
}

/** Bộ đếm giới hạn tốc độ gửi. allow() trả về true nếu được gửi bây giờ. */
export function createRateLimiter() {
  const sent = []
  return {
    allow(now = Date.now()) {
      while (sent.length && now - sent[0] > BURST.windowMs) sent.shift()
      if (sent.length && now - sent[sent.length - 1] < MIN_GAP_MS) return false
      if (sent.length >= BURST.count) return false
      sent.push(now)
      return true
    },
  }
}

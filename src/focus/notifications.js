// Thông báo trình duyệt khi hết giờ Pomodoro. Chỉ xin quyền khi người dùng tự bấm "Bắt đầu".
const supported = () => typeof window !== 'undefined' && 'Notification' in window

export function requestNotificationPermission() {
  if (supported() && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
}

export function notify(body) {
  if (!supported() || Notification.permission !== 'granted') return
  try {
    new Notification('Chilly Coffee', { body, tag: 'chilly-pomodoro' })
  } catch {
    // một số trình duyệt chỉ cho gửi qua service worker; đã có thông báo trong quán thay thế
  }
}

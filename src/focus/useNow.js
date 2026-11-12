import { useEffect, useState } from 'react'

/** Thời điểm hiện tại, cập nhật mỗi `interval` ms (để đồng hồ đếm ngược tự chạy). */
export function useNow(interval = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

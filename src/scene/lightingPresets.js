// Thông số ngày/đêm lấy từ nút "Buổi tối" của bản thử
export const LIGHTING_PRESETS = {
  day: {
    sky: '#9fb4c6',
    environment: 0.35,
    hemisphere: 0.45,
    sun: 0.75,
    spot: 0.7,
    lampMultiplier: 1,
  },
  night: {
    sky: '#15171c',
    environment: 0.35,
    hemisphere: 0.15,
    sun: 0.03,
    spot: 1.1,
    lampMultiplier: 1.35,
  },
}

/** Buổi tối từ 18:00 đến 6:00 theo giờ máy người dùng */
export function presetForHour(hour) {
  return hour >= 18 || hour < 6 ? 'night' : 'day'
}

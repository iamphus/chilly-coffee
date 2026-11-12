// Thông số ngày/đêm lấy từ nút "Buổi tối" của bản thử
export const LIGHTING_PRESETS = {
  day: {
    sky: '#9fb4c6',
    environment: 0.35,
    hemisphere: 0.45,
    sun: 0.75,
    spot: 0.7,
    lampMultiplier: 1,
    lampGlow: 0.18, // độ sáng quầng đèn giả
    dust: 0.35, // độ sáng hạt bụi bay
    // Bên ngoài (src/scene/surroundings/)
    skyTop: '#7fb2e5',
    skyHorizon: '#f1e3c8', // cũng là màu sương: cảnh xa hoà vào chân trời
    moon: 0, // ánh trăng (đèn hướng xanh nhạt) cho công viên buổi tối
    stars: 0,
    clouds: 0.95,
    lampHead: 0.5, // độ sáng bóng đèn công viên
    fireflies: 0,
  },
  night: {
    sky: '#15171c',
    environment: 0.35,
    hemisphere: 0.15,
    sun: 0.03,
    spot: 1.1,
    lampMultiplier: 1.35,
    lampGlow: 0.55,
    dust: 0.75,
    skyTop: '#0a0f24',
    skyHorizon: '#3a3560',
    moon: 0.32,
    stars: 1,
    clouds: 0,
    lampHead: 3,
    fireflies: 0.9,
  },
}

// Trời mưa: bầu trời xám, nắng / trăng yếu đi, không sao, sương dày hơn
const RAINY = {
  day: { skyTop: '#8d99a6', skyHorizon: '#b9bfc4', sun: 0.3, hemisphere: 0.38, clouds: 0.9, fogNear: 12, fogFar: 55 },
  night: { skyTop: '#0c1018', skyHorizon: '#252a38', moon: 0.18, stars: 0, fogNear: 10, fogFar: 50 },
}

/** Thông số ánh sáng của `time` ('day' | 'night'), có tính trời mưa. */
export function lightingFor(time, rain) {
  return rain ? { ...LIGHTING_PRESETS[time], ...RAINY[time] } : LIGHTING_PRESETS[time]
}

/** Buổi tối từ 18:00 đến 6:00 theo giờ máy người dùng */
export function presetForHour(hour) {
  return hour >= 18 || hour < 6 ? 'night' : 'day'
}

// Thêm ?time=day hoặc ?time=night vào URL để xem thử
const requestedTime = new URLSearchParams(window.location.search).get('time')

/** 'day' | 'night' theo URL, rồi tới cài đặt (store.timeOfDay), cuối cùng theo giờ máy. */
export function effectiveTimeOfDay(setting) {
  if (LIGHTING_PRESETS[requestedTime]) return requestedTime
  if (LIGHTING_PRESETS[setting]) return setting
  return presetForHour(new Date().getHours())
}

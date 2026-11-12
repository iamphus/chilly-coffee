import Cafe from './Cafe.jsx'
import CameraRig from './CameraRig.jsx'
import Fog from './Fog.jsx'
import Guests from './Guests.jsx'
import Lighting from './Lighting.jsx'
import { LIGHTING_PRESETS, presetForHour } from './lightingPresets.js'
import Passersby from './Passersby.jsx'

// Ngày/đêm theo giờ máy. Thêm ?time=day hoặc ?time=night vào URL để xem thử.
const requestedTime = new URLSearchParams(window.location.search).get('time')
const TIME_OF_DAY = LIGHTING_PRESETS[requestedTime] ? requestedTime : presetForHour(new Date().getHours())
const PRESET = LIGHTING_PRESETS[TIME_OF_DAY]

export default function Scene() {
  return (
    <>
      <Lighting preset={PRESET} />
      <Fog color={PRESET.sky} />
      {/* Nhìn toàn cảnh từ trên xuống nên bỏ trần */}
      <Cafe showCeiling={false} />
      <Guests />
      <Passersby />
      <CameraRig />
    </>
  )
}

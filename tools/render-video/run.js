// Quay video nền cho landing từ cảnh quán 3D.
//
// Cách dùng (chạy từ thư mục gốc, cần `npm run dev` đang chạy ở cổng 5173):
//   npm run build:video              quay toàn bộ → assets/video/landing.mp4 + landing-poster.jpg
//   npm run build:video -- --stills  chỉ chụp đầu/giữa/cuối mỗi cảnh vào tmp/video-stills/ để chỉnh góc máy
//   npm run build:video -- --encode  chỉ ghép lại từ khung hình đã quay trong tmp/video-frames/ (không cần dev server)
//
// Trên Windows nên dùng Edge có sẵn để render bằng card đồ hoạ: PW_CHANNEL=msedge npm run build:video
const { chromium } = require('playwright')
const ffmpeg = require('ffmpeg-static')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PAGE = 'http://localhost:5173/tools/render-video/index.html'
const FRAMES_DIR = 'tmp/video-frames'
const STILLS_DIR = 'tmp/video-stills'
const OUT_DIR = 'assets/video'
const WARM_UP_SECONDS = 2
// Quay ở 1920×1080 cho mịn rồi thu về 1280×720: nền có lớp tối phủ nên không cần nét hơn, file nhẹ hơn nhiều.
const OUTPUT_SIZE = '1280:720'
const CRF = 27 // chất lượng H.264: số càng nhỏ càng nét, file càng nặng
// Phải khớp với tools/render-video/shots.js (dùng khi --encode, lúc đó không mở trang)
const DEFAULT_SETTINGS = { fps: 30, crossfade: 0.8 }

const stillsOnly = process.argv.includes('--stills')
const encodeOnly = process.argv.includes('--encode')

function saveDataUrl(dataUrl, file) {
  fs.writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}

async function openStudio() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (error) => console.error('Lỗi trang:', error.message))
  try {
    await page.goto(PAGE)
  } catch {
    throw new Error(`Không mở được ${PAGE}. Chạy "npm run dev" trước rồi thử lại.`)
  }
  await page.waitForFunction('window.studioReady === true', null, { timeout: 180000 })
  const settings = await page.evaluate('window.videoSettings')
  // Chạy thử vài giây để hoạt ảnh và bóng đổ ổn định
  await page.evaluate((seconds) => window.warmUp(seconds), WARM_UP_SECONDS)
  return { browser, page, settings }
}

async function renderStills(page, shotCount) {
  resetDir(STILLS_DIR)
  for (let index = 0; index < shotCount; index++) {
    const { name, frames } = await page.evaluate((i) => window.prepareShot(i), index)
    for (const [label, frame] of [['dau', 0], ['giua', Math.floor(frames / 2)], ['cuoi', frames - 1]]) {
      const dataUrl = await page.evaluate(([i, f]) => window.renderFrame(i, f, { still: true }), [index, frame])
      saveDataUrl(dataUrl, path.join(STILLS_DIR, `${index + 1}-${name}-${label}.jpg`))
    }
    console.log(`Cảnh ${index + 1} (${name}): đã chụp`)
  }
}

async function renderShots(page, shotCount) {
  resetDir(FRAMES_DIR)
  const shots = []
  for (let index = 0; index < shotCount; index++) {
    const { name, frames } = await page.evaluate((i) => window.prepareShot(i), index)
    const dir = path.join(FRAMES_DIR, `${index + 1}-${name}`)
    fs.mkdirSync(dir)
    for (let frame = 0; frame < frames; frame++) {
      const dataUrl = await page.evaluate(([i, f]) => window.renderFrame(i, f), [index, frame])
      saveDataUrl(dataUrl, path.join(dir, `${String(frame).padStart(4, '0')}.jpg`))
    }
    console.log(`Cảnh ${index + 1} (${name}): ${frames} khung hình`)
    shots.push({ dir, frames })
  }
  return shots
}

/**
 * Ghép các cảnh bằng chuyển cảnh mờ dần. Để video lặp liền mạch, đoạn đầu của cảnh 1
 * (dài bằng một lần chuyển cảnh) được cắt ra và đặt ở cuối, mờ dần từ cảnh cuối sang.
 */
function encode(shots, { fps, crossfade }) {
  const inputs = shots.flatMap(({ dir }) => ['-framerate', String(fps), '-i', path.join(dir, '%04d.jpg')])
  const lengths = shots.map(({ frames }) => frames / fps)

  const filters = [
    `[0:v]split=2[headsrc][bodysrc]`,
    `[headsrc]trim=end=${crossfade},setpts=PTS-STARTPTS[head]`,
    `[bodysrc]trim=start=${crossfade},setpts=PTS-STARTPTS[seg0]`,
  ]
  const segments = ['seg0', ...shots.slice(1).map((_, i) => `${i + 1}:v`), 'head']
  const segmentLengths = [lengths[0] - crossfade, ...lengths.slice(1), crossfade]

  let previous = segments[0]
  let total = segmentLengths[0]
  for (let i = 1; i < segments.length; i++) {
    const label = i === segments.length - 1 ? 'joined' : `x${i}`
    const offset = (total - crossfade).toFixed(3)
    filters.push(`[${previous}][${segments[i]}]xfade=transition=fade:duration=${crossfade}:offset=${offset}[${label}]`)
    total += segmentLengths[i] - crossfade
    previous = label
  }
  // Chỉnh màu nhẹ kiểu quảng cáo: tăng bão hoà một chút, tối viền
  filters.push(
    `[joined]scale=${OUTPUT_SIZE}:flags=lanczos,eq=saturation=1.06:contrast=1.03,vignette=angle=PI/6,format=yuv420p[out]`,
  )

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const video = path.join(OUT_DIR, 'landing.mp4')
  const poster = path.join(OUT_DIR, 'landing-poster.jpg')
  execFileSync(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-profile:v', 'high',
    '-movflags', '+faststart', '-an',
    video,
  ], { stdio: 'inherit' })
  // Ảnh poster = khung hình đầu tiên, để lúc video bắt đầu chạy không bị giật hình
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-frames:v', '1', '-q:v', '4', poster], {
    stdio: 'inherit',
  })

  const mb = (file) => (fs.statSync(file).size / 1024 / 1024).toFixed(2)
  console.log(`${video}: ${total.toFixed(1)} giây, ${mb(video)} MB`)
  console.log(`${poster}: ${mb(poster)} MB`)
}

function framesOnDisk() {
  if (!fs.existsSync(FRAMES_DIR)) throw new Error(`Chưa có ${FRAMES_DIR}. Chạy "npm run build:video" trước.`)
  return fs
    .readdirSync(FRAMES_DIR)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((name) => {
      const dir = path.join(FRAMES_DIR, name)
      return { dir, frames: fs.readdirSync(dir).length }
    })
}

;(async () => {
  if (encodeOnly) {
    encode(framesOnDisk(), DEFAULT_SETTINGS)
    return
  }
  const { browser, page, settings } = await openStudio()
  try {
    if (stillsOnly) {
      await renderStills(page, settings.shotCount)
    } else {
      const shots = await renderShots(page, settings.shotCount)
      encode(shots, settings)
    }
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

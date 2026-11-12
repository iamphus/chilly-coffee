// Quay video nền cho landing từ cảnh quán 3D.
//
// Cách dùng (chạy từ thư mục gốc, cần `npm run dev` đang chạy ở cổng 5173):
//   npm run build:video              quay toàn bộ → assets/video/landing-1440p.mp4, landing-1080p.mp4, landing-poster.jpg
//   npm run build:video -- --stills  chỉ chụp đầu/giữa/cuối mỗi cảnh vào tmp/video-stills/ để chỉnh góc máy
//   npm run build:video -- --encode  chỉ ghép lại từ khung hình đã quay trong tmp/video-frames/ (không cần dev server)
//
// Trên Windows nên dùng Edge có sẵn để render bằng card đồ hoạ: PW_CHANNEL=msedge npm run build:video
// Kịch bản (cảnh quay, góc máy, độ phân giải) nằm trong tools/render-video/shots.js.
const { chromium } = require('playwright')
const ffmpeg = require('ffmpeg-static')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PAGE = 'http://localhost:5173/tools/render-video/index.html'
const FRAMES_DIR = 'tmp/video-frames'
const SETTINGS_FILE = path.join(FRAMES_DIR, 'settings.json') // để --encode biết cách ghép mà không mở trang
const STILLS_DIR = 'tmp/video-stills'
const OUT_DIR = 'assets/video'
// Xuất 2 bản: 2K cho màn hình lớn / độ phân giải cao, 1080p cho phần còn lại (landing tự chọn bằng <source media>).
// crf: chất lượng H.264, số càng nhỏ càng nét, file càng nặng.
const VARIANTS = [
  { file: 'landing-1440p.mp4', width: 2560, height: 1440, crf: 23 },
  { file: 'landing-1080p.mp4', width: 1920, height: 1080, crf: 23 },
]
const TUNE = 'animation' // hợp với hình phẳng, mảng màu lớn

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
  // Trang studio tự đặt kích thước canvas theo shots.js; viewport chỉ cần đủ lớn
  const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } })
  page.on('pageerror', (error) => console.error('Lỗi trang:', error.message))
  try {
    await page.goto(PAGE)
  } catch {
    throw new Error(`Không mở được ${PAGE}. Chạy "npm run dev" trước rồi thử lại.`)
  }
  await page.waitForFunction('window.studioReady === true', null, { timeout: 180000 })
  const settings = await page.evaluate('window.videoSettings')
  await page.evaluate(() => window.warmUp()) // chạy trước vài giây để hoạt ảnh và bóng đổ ổn định
  return { browser, page, settings }
}

async function renderStills(page, shotCount) {
  resetDir(STILLS_DIR)
  for (let index = 0; index < shotCount; index++) {
    const { name, frames } = await page.evaluate((i) => window.prepareShot(i), index)
    for (const [label, frame] of [['dau', 0], ['giua', Math.floor(frames / 2)], ['cuoi', frames - 1]]) {
      const dataUrl = await page.evaluate(([i, f]) => window.renderFrame(i, f), [index, frame])
      saveDataUrl(dataUrl, path.join(STILLS_DIR, `${index + 1}-${name}-${label}.jpg`))
    }
    console.log(`Cảnh ${index + 1} (${name}): đã chụp`)
  }
}

async function renderShots(page, settings) {
  resetDir(FRAMES_DIR)
  const shots = []
  for (let index = 0; index < settings.transitions.length; index++) {
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
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  return shots
}

/**
 * Ghép các cảnh theo kiểu chuyển cảnh của từng cảnh ('cut' hoặc 'fade').
 * Để video lặp liền mạch, đoạn đầu của cảnh 1 (dài bằng một lần chuyển cảnh) được cắt ra
 * và đặt ở cuối, mờ dần từ cảnh cuối sang; video bắt đầu đúng chỗ đoạn đó kết thúc.
 */
function encode(shots, { fps, crossfade, transitions }) {
  const inputs = shots.flatMap(({ dir }) => ['-framerate', String(fps), '-i', path.join(dir, '%04d.jpg')])
  const lengths = shots.map(({ frames }) => frames / fps)

  const filters = [
    `[0:v]split=2[headsrc][bodysrc]`,
    `[headsrc]trim=end=${crossfade},setpts=PTS-STARTPTS[head]`,
    `[bodysrc]trim=start=${crossfade},setpts=PTS-STARTPTS[seg0]`,
  ]
  const segments = [
    { label: 'seg0', length: lengths[0] - crossfade },
    ...shots.slice(1).map((_, i) => ({ label: `${i + 1}:v`, length: lengths[i + 1], transition: transitions[i + 1] })),
    { label: 'head', length: crossfade, transition: 'fade' },
  ]

  let previous = segments[0].label
  let total = segments[0].length
  for (let i = 1; i < segments.length; i++) {
    const { label, length, transition } = segments[i]
    const output = i === segments.length - 1 ? 'joined' : `x${i}`
    if (transition === 'cut') {
      // concat đổi đơn vị thời gian, đưa về lại 1/fps để xfade phía sau ghép được
      filters.push(`[${previous}][${label}]concat=n=2:v=1:a=0,settb=1/${fps}[${output}]`)
      total += length
    } else {
      const offset = (total - crossfade).toFixed(3)
      filters.push(`[${previous}][${label}]xfade=transition=fade:duration=${crossfade}:offset=${offset}[${output}]`)
      total += length - crossfade
    }
    previous = output
  }
  // Chỉnh màu nhẹ kiểu quảng cáo, tối viền; rồi thu nhỏ từ bản render siêu mẫu về từng độ phân giải
  filters.push(`[joined]eq=saturation=1.06:contrast=1.03,vignette=angle=PI/6,split=${VARIANTS.length}${VARIANTS.map((_, i) => `[v${i}]`).join('')}`)
  VARIANTS.forEach(({ width, height }, i) => {
    filters.push(`[v${i}]scale=${width}:${height}:flags=lanczos,format=yuv420p[out${i}]`)
  })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outputs = VARIANTS.flatMap(({ file, crf }, i) => [
    '-map', `[out${i}]`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-tune', TUNE, '-profile:v', 'high',
    '-movflags', '+faststart', '-an',
    path.join(OUT_DIR, file),
  ])
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), ...outputs], {
    stdio: 'inherit',
  })

  // Ảnh poster = khung hình đầu tiên (lấy từ bản nhỏ cho nhẹ), để lúc video bắt đầu chạy không bị giật hình
  const poster = path.join(OUT_DIR, 'landing-poster.jpg')
  const smallest = path.join(OUT_DIR, VARIANTS.at(-1).file)
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', smallest, '-frames:v', '1', '-q:v', '3', poster], {
    stdio: 'inherit',
  })

  const mb = (file) => (fs.statSync(file).size / 1024 / 1024).toFixed(2)
  for (const { file, width, height } of VARIANTS) {
    console.log(`${path.join(OUT_DIR, file)}: ${width}×${height}, ${total.toFixed(1)} giây, ${mb(path.join(OUT_DIR, file))} MB`)
  }
  console.log(`${poster}: ${mb(poster)} MB`)
}

function framesOnDisk() {
  if (!fs.existsSync(SETTINGS_FILE)) throw new Error(`Chưa có ${FRAMES_DIR}. Chạy "npm run build:video" trước.`)
  const shots = fs
    .readdirSync(FRAMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => parseInt(a.name) - parseInt(b.name))
    .map(({ name }) => {
      const dir = path.join(FRAMES_DIR, name)
      return { dir, frames: fs.readdirSync(dir).length }
    })
  return { shots, settings: JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }
}

;(async () => {
  if (encodeOnly) {
    const { shots, settings } = framesOnDisk()
    encode(shots, settings)
    return
  }
  const { browser, page, settings } = await openStudio()
  try {
    if (stillsOnly) {
      await renderStills(page, settings.transitions.length)
    } else {
      encode(await renderShots(page, settings), settings)
    }
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

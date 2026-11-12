// Texture vẽ bằng canvas cho cây (không tải ảnh ngoài). Vẽ màu xám sáng, màu thật lấy từ vertex color.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

function drawLeaf(context, x, y, length, width, angle, shade) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.beginPath()
  context.moveTo(0, 0)
  context.bezierCurveTo(width, -length * 0.25, width * 0.8, -length * 0.8, 0, -length)
  context.bezierCurveTo(-width * 0.8, -length * 0.8, -width, -length * 0.25, 0, 0)
  context.fillStyle = `rgb(${shade},${shade},${shade})`
  context.fill()
  // gân lá
  context.strokeStyle = `rgba(0,0,0,0.18)`
  context.lineWidth = Math.max(1, width * 0.12)
  context.beginPath()
  context.moveTo(0, -length * 0.05)
  context.lineTo(0, -length * 0.92)
  context.stroke()
  context.restore()
}

function drawBlossom(context, x, y, radius, shade) {
  context.fillStyle = `rgb(${shade},${shade},${shade})`
  for (let p = 0; p < 5; p++) {
    const angle = (p / 5) * Math.PI * 2
    context.beginPath()
    context.ellipse(x + Math.cos(angle) * radius * 0.55, y + Math.sin(angle) * radius * 0.55, radius * 0.55, radius * 0.4, angle, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = 'rgba(120,90,40,0.55)' // nhụy
  context.beginPath()
  context.arc(x, y, radius * 0.22, 0, Math.PI * 2)
  context.fill()
}

let foliage = null

/**
 * Atlas 2 ô cho tấm lá: nửa trái là chùm lá, nửa phải là chùm hoa (anh đào, bằng lăng, phượng).
 * UV của tấm lá chọn nửa nào (xem treeBuilder.js).
 */
export function foliageTexture() {
  if (foliage) return foliage
  const random = seeded(31)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')

  // Chùm lá: dày ở giữa, thưa ra mép, lá chĩa ra ngoài
  for (let i = 0; i < 70; i++) {
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * 92
    const x = 128 + Math.cos(angle) * distance
    const y = 128 + Math.sin(angle) * distance
    const length = 30 + random() * 26
    drawLeaf(context, x, y, length, length * (0.32 + random() * 0.12), angle + Math.PI / 2 + (random() - 0.5) * 0.9, Math.round(150 + random() * 105))
  }

  // Chùm hoa: nhiều bông nhỏ, xen vài lá
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * 88
    drawLeaf(context, 384 + Math.cos(angle) * distance, 128 + Math.sin(angle) * distance, 26, 9, angle + Math.PI / 2, Math.round(120 + random() * 50))
  }
  for (let i = 0; i < 60; i++) {
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * 96
    drawBlossom(context, 384 + Math.cos(angle) * distance, 128 + Math.sin(angle) * distance, 9 + random() * 7, Math.round(205 + random() * 50))
  }

  foliage = new CanvasTexture(canvas)
  foliage.colorSpace = SRGBColorSpace
  foliage.anisotropy = 4
  return foliage
}

let bark = null

/** Vỏ cây: vân dọc và vài mắt gỗ, lặp theo chiều dài cành. */
export function barkTexture() {
  if (bark) return bark
  const random = seeded(17)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = '#b8b0a6'
  context.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 70; i++) {
    const x = random() * 128
    const shade = Math.round(120 + random() * 110)
    context.strokeStyle = `rgba(${shade},${shade - 6},${shade - 12},0.8)`
    context.lineWidth = 1 + random() * 3
    context.beginPath()
    context.moveTo(x, 0)
    for (let y = 0; y <= 256; y += 32) context.lineTo(x + (random() - 0.5) * 6, y)
    context.stroke()
  }
  for (let i = 0; i < 5; i++) {
    context.fillStyle = 'rgba(70,60,50,0.45)'
    context.beginPath()
    context.ellipse(random() * 128, random() * 256, 4 + random() * 4, 7 + random() * 6, 0, 0, Math.PI * 2)
    context.fill()
  }
  bark = new CanvasTexture(canvas)
  bark.colorSpace = SRGBColorSpace
  bark.wrapS = bark.wrapT = RepeatWrapping
  return bark
}

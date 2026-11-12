import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color } from 'three'

// Mưa: mỗi hạt là một vệt mảnh (2 đỉnh), vị trí tính hoàn toàn trong shader theo thời gian nên CPU không phải làm gì.
// Khối mưa bao quanh camera nhưng hạt đứng yên theo thế giới (không trôi theo khi đi lại).
const AREA = 24 // m: cạnh khối mưa quanh camera (nhỏ lại để mưa dày quanh người chơi)
const HEIGHT = 16 // m
const SPEED = 11 // m/s
const LENGTH = 0.85 // m: độ dài vệt mưa
const WIND = 0.08 // độ nghiêng theo gió
// Dưới mái quán thì không có mưa; sân vườn không có mái nên vẫn mưa
const ROOF = [-3.95, 3.75, -13.3, 3.15] // xMin, xMax, zMin, zMax
const ROOF_HEIGHT = 3.6
const OPEN_YARD = [-3.6, 0.4, -6.2, -3.2]

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  uniform vec4 uRoof;
  uniform vec4 uYard;
  attribute vec3 aSeed;
  attribute float aEnd;
  varying float vAlpha;

  bool inside(vec2 p, vec4 r) { return p.x > r.x && p.x < r.y && p.y > r.z && p.y < r.w; }

  void main() {
    float x = uCenter.x + (fract(aSeed.x - uCenter.x / ${AREA.toFixed(1)}) - 0.5) * ${AREA.toFixed(1)};
    float z = uCenter.z + (fract(aSeed.z - uCenter.z / ${AREA.toFixed(1)}) - 0.5) * ${AREA.toFixed(1)};
    float y = mod(aSeed.y * ${HEIGHT.toFixed(1)} - uTime * ${SPEED.toFixed(1)} * (0.85 + aSeed.x * 0.3), ${HEIGHT.toFixed(1)});
    y -= aEnd * ${LENGTH.toFixed(2)};
    x += y * ${WIND.toFixed(2)};

    vAlpha = 1.0;
    if (y < ${ROOF_HEIGHT.toFixed(1)} && inside(vec2(x, z), uRoof) && !inside(vec2(x, z), uYard)) vAlpha = 0.0;
    float distance = length(vec2(x, z) - uCenter.xz);
    vAlpha *= 1.0 - smoothstep(${(AREA * 0.3).toFixed(1)}, ${(AREA * 0.5).toFixed(1)}, distance);
    vAlpha *= mix(1.0, 0.35, aEnd); // đuôi vệt mờ hơn đầu

    gl_Position = projectionMatrix * viewMatrix * vec4(x, y, z, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(uColor, uOpacity * vAlpha);
    #include <colorspace_fragment>
  }
`

export default function Rain({ count = 6000, color = '#c4d2e2', opacity = 0.62 }) {
  const lines = useRef(null)
  const geometry = useMemo(() => {
    let state = 12345
    const random = () => (state = (state * 16807) % 2147483647) / 2147483647
    const seeds = new Float32Array(count * 2 * 3)
    const ends = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const seed = [random(), random(), random()]
      seeds.set(seed, i * 6)
      seeds.set(seed, i * 6 + 3)
      ends[i * 2 + 1] = 1
    }
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(new Float32Array(count * 2 * 3), 3)) // vị trí thật tính trong shader
    buffer.setAttribute('aSeed', new BufferAttribute(seeds, 3))
    buffer.setAttribute('aEnd', new BufferAttribute(ends, 1))
    return buffer
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCenter: { value: [0, 0, 0] },
      uRoof: { value: ROOF },
      uYard: { value: OPEN_YARD },
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
    }),
    [color, opacity],
  )

  useFrame(({ camera, clock }) => {
    const material = lines.current?.material
    if (!material) return
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uCenter.value = camera.position.toArray()
  })

  return (
    <lineSegments ref={lines} geometry={geometry} frustumCulled={false} renderOrder={4}>
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} />
    </lineSegments>
  )
}

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Euler, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { barkTexture, foliageTexture } from './treeTextures.js'
import { VARIANTS_PER_SPECIES, buildTreeTemplates } from './treeBuilder.js'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Đồng hồ gió dùng chung cho mọi vật liệu cây (uniform của shader)
const windTime = { value: 0 }

/**
 * Gió: đẩy đỉnh theo sin(thời gian), càng cao càng lắc nhiều, mỗi cây lệch pha theo vị trí.
 * Gỗ và lá dùng cùng công thức nên cành không rời khỏi lá.
 */
function withWind(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 windOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 windOrigin = vec3(0.0);
        #endif
        float windPhase = windOrigin.x * 0.37 + windOrigin.z * 0.21;
        float windHeight = max(position.y - 1.0, 0.0);
        transformed.x += sin(uWindTime * 1.3 + windPhase + position.y * 0.6) * 0.035 * windHeight;
        transformed.z += cos(uWindTime * 1.05 + windPhase + position.x * 0.8) * 0.025 * windHeight;`,
      )
  }
  material.customProgramCacheKey = () => 'tree-wind'
  return material
}

function TreeGroup({ geometry, material, placements, castShadow }) {
  const mesh = useRef(null)
  useLayoutEffect(() => {
    const instanced = mesh.current
    const matrix = new Matrix4()
    const quaternion = new Quaternion()
    const euler = new Euler()
    const position = new Vector3()
    const scale = new Vector3()
    placements.forEach((tree, index) => {
      quaternion.setFromEuler(euler.set(0, tree.rotationY, 0))
      instanced.setMatrixAt(index, matrix.compose(position.fromArray(tree.position), quaternion, scale.setScalar(tree.scale)))
    })
    instanced.instanceMatrix.needsUpdate = true
    instanced.computeBoundingSphere() // để không vẽ nhóm cây nằm ngoài khung nhìn
  }, [placements])

  return <instancedMesh ref={mesh} args={[geometry, material, placements.length]} castShadow={castShadow} receiveShadow />
}

/**
 * Cây sinh bằng code (treeBuilder.js). placements: [{ species, position, scale, rotationY, variant? }].
 * Mỗi loài × biến thể × (gỗ, lá) là một InstancedMesh.
 */
export default function Trees({ placements, castShadow = true }) {
  const templates = useMemo(() => buildTreeTemplates(), [])
  const materials = useMemo(
    () => ({
      wood: withWind(new MeshStandardMaterial({ map: barkTexture(), vertexColors: true, roughness: 1 })),
      leaves: withWind(
        new MeshStandardMaterial({ map: foliageTexture(), vertexColors: true, roughness: 0.85, alphaTest: 0.45, side: DoubleSide }),
      ),
    }),
    [],
  )

  // Chia cây theo loài + biến thể (biến thể chọn theo vị trí nếu không chỉ định)
  const groups = useMemo(() => {
    const byKey = new Map()
    for (const tree of placements) {
      const variant = tree.variant ?? Math.abs(Math.round(tree.position[0] * 3.1 + tree.position[2] * 1.7)) % VARIANTS_PER_SPECIES
      const key = `${tree.species}:${variant}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(tree)
    }
    return [...byKey.entries()]
  }, [placements])

  useFrame((_, delta) => {
    if (!prefersReducedMotion) windTime.value += Math.min(delta, 0.1)
  })

  return groups.map(([key, trees]) => (
    <group key={key}>
      <TreeGroup geometry={templates[key].wood} material={materials.wood} placements={trees} castShadow={castShadow} />
      <TreeGroup geometry={templates[key].leaves} material={materials.leaves} placements={trees} castShadow={castShadow} />
    </group>
  ))
}

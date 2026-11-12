import { useLayoutEffect, useRef } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'

const matrix = new Matrix4()
const position = new Vector3()
const quaternion = new Quaternion()
const scale = new Vector3()
const euler = new Euler()
const color = new Color()

/**
 * Vẽ nhiều bản của cùng một hình trong một lần vẽ (InstancedMesh).
 * items: [{ position: [x, y, z], scale: số hoặc [x, y, z], rotationY?, color? }]
 * children: hình học (vd. <boxGeometry />), material: props cho vật liệu;
 * basic: dùng meshBasicMaterial (không chịu ánh sáng: quầng đèn, vệt sáng) thay cho meshStandardMaterial.
 */
export default function Instances({ items, children, material, basic = false, castShadow = false, receiveShadow = false, renderOrder }) {
  const mesh = useRef(null)
  const hasColor = items.some((item) => item.color)

  useLayoutEffect(() => {
    const instanced = mesh.current
    items.forEach((item, index) => {
      position.fromArray(item.position)
      quaternion.setFromEuler(euler.set(0, item.rotationY ?? 0, 0))
      if (Array.isArray(item.scale)) scale.fromArray(item.scale)
      else scale.setScalar(item.scale ?? 1)
      instanced.setMatrixAt(index, matrix.compose(position, quaternion, scale))
      if (hasColor) instanced.setColorAt(index, color.set(item.color ?? '#ffffff'))
    })
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    instanced.computeBoundingSphere()
  }, [items, hasColor])

  if (!items.length) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      renderOrder={renderOrder}
      frustumCulled={false}
    >
      {children}
      {basic ? <meshBasicMaterial {...material} /> : <meshStandardMaterial {...material} />}
    </instancedMesh>
  )
}

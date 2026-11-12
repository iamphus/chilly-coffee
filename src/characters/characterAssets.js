import { useGLTF } from '@react-three/drei'

// id nhân vật → URL file GLB (Vite chỉ tải file nào thật sự được dùng)
export const CHARACTER_URLS = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../assets/characters/*.glb', {
      query: '?url',
      import: 'default',
      eager: true,
    }),
  ).map(([path, url]) => [path.match(/([^/]+)\.glb$/)[1], url]),
)

/** Hoạt ảnh có sẵn trong mỗi file nhân vật */
export const CLIPS = {
  STAND: 'Dung',
  WALK: 'Di_Bo',
  TYPE: 'Ngoi_Go_Phim',
  DRINK: 'Uong',
  WAVE: 'Vay_Tay',
  BREW: 'Pha_Che',
}

export function preloadCharacters(ids) {
  for (const id of ids) useGLTF.preload(CHARACTER_URLS[id])
}

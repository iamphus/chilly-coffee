import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { tagAnchors, useNetStore } from '../net/netStore.js'
import { statusText, useFollowAnchor } from './tagHelpers.js'

function PeerTag({ id, peer }) {
  const { t } = useTranslation()
  const getAnchor = useCallback(() => tagAnchors.get(id), [id])
  const { tag, bubble } = useFollowAnchor(getAnchor, id)
  const status = statusText(t, peer)
  return (
    <div ref={tag} className="peer-tag" aria-hidden="true">
      <p ref={bubble} className="chat-bubble" hidden />
      <div className="name-tag name-tag--peer">
        <span className={`name-tag__dot name-tag__dot--${peer.status ?? 'idle'}`} />
        <span>
          {peer.name}
          {status && <small>{status}</small>}
        </span>
      </div>
    </div>
  )
}

/** Bảng tên + bong bóng chat của mọi người chơi khác (vị trí do RemotePlayers tính). */
export default function PeerTags() {
  const peers = useNetStore((state) => state.peers)
  return Object.entries(peers).map(([id, peer]) => <PeerTag key={id} id={id} peer={peer} />)
}

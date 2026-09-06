'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ItemActions from '@/components/ItemActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { MenuItem } from '@/components/ui/OverflowMenu'
import { apiErrorMessage } from '@/lib/apiError'

/**
 * Everything you can do to one photo, in one menu.
 *
 * The owner's Delete and "Remove from album" were text links under the
 * visibility switch, while Report was a bordered row further down the page, so
 * the actions for a single photo were in two places depending on who was
 * looking. Visibility stays a visible switch because it is a state you need to
 * see, not an action you go looking for.
 */
export default function PhotoActions({
  photoId,
  ownerUsername,
  isOwner,
  canBlock,
  initiallyBlocked,
  albumId,
  albumName,
}: {
  photoId: string
  ownerUsername: string
  isOwner: boolean
  /** Signed in and looking at someone else's photo. */
  canBlock: boolean
  initiallyBlocked: boolean
  /** Set when the photo was reached from an album, enabling "remove from album". */
  albumId?: string
  albumName?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function removeFromAlbum() {
    if (!albumId || busy) return
    setBusy(true)
    try {
      // The album comes from the query string and nothing on the way in checks
      // that this photo is in it. The PATCH deletes by id and answers with the
      // album either way, so its response cannot tell a removal from a no-op:
      // the photo is absent from the returned list in both cases. Sent blind, a
      // stale or hand-edited albumId was answered with "Removed from the album"
      // for a removal that never happened, so membership is read first.
      const albumRes = await fetch(`/api/albums/${albumId}`)
      if (!albumRes.ok) {
        toast(await apiErrorMessage(albumRes, 'Could not remove it from the album'), 'error')
        return
      }
      const album = (await albumRes.json()) as { photos?: { photoId?: string }[] }
      if (!Array.isArray(album.photos) || !album.photos.some(entry => entry.photoId === photoId)) {
        toast('This photo is not in that album', 'info')
        return
      }

      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removePhotoIds: [photoId] }),
      })
      if (!res.ok) {
        toast('Could not remove it from the album', 'error')
        return
      }
      toast('Removed from the album. The photo is still yours.', 'success')
      router.push(`/albums/${albumId}`)
    } catch {
      // Two requests now, and a failure in either left the menu silently
      // un-busy with nothing said, the same way a failed delete used to.
      toast('Could not reach the server', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deletePhoto() {
    // A throw here propagated into ConfirmDialog, which resets its own busy
    // flag in a finally and says nothing, so a failed delete looked like a
    // dialog that had simply ignored the button.
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
        return
      }
      toast(await apiErrorMessage(res, 'Could not delete the photo'), 'error')
    } catch {
      toast('Could not reach the server', 'error')
    }
    setConfirmingDelete(false)
  }

  const ownerItems: MenuItem[] = isOwner
    ? [
        ...(albumId
          ? [
              {
                label: albumName ? `Remove from ${albumName}` : 'Remove from album',
                onSelect: removeFromAlbum,
                disabled: busy,
              },
            ]
          : []),
        {
          label: 'Delete photo',
          onSelect: () => setConfirmingDelete(true),
          destructive: true,
          disabled: busy,
          startsGroup: true,
        },
      ]
    : []

  return (
    <>
      <ItemActions
        label="Photo actions"
        copyLink={`/photos/${photoId}`}
        items={ownerItems}
        // You cannot report or block yourself, and neither is offered on your
        // own photo.
        report={isOwner ? undefined : { targetType: 'photo', targetId: photoId }}
        block={canBlock ? { username: ownerUsername, initiallyBlocked } : undefined}
      />

      {/* Spells out that this is not the same as making it private, because
          people reached for delete wanting "hide this" and lost the photo. */}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this photo?"
        confirmLabel="Delete"
        busyLabel="Deleting…"
        destructive
        onConfirm={deletePhoto}
        onClose={() => setConfirmingDelete(false)}
      >
        <p className="mb-3">
          It will be removed from AvoidXray entirely, including every album, your profile and
          explore. This cannot be undone.
        </p>
        <p>To take it out of public view instead, close this and set it to Private.</p>
      </ConfirmDialog>
    </>
  )
}

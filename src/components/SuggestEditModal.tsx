'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { FORMATS } from '@/lib/constants'
import { BODY_TYPES, BODY_TYPE_LABELS } from '@/lib/cameraFields'
import { COLOR_BALANCES, FILM_PROCESSES } from '@/lib/filmFields'
import { useRouter } from 'next/navigation'
import { useToast } from './ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import { fieldClass, fieldClassMultiline } from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { useDialogBehavior } from '@/components/ui/dialog'
import type { FilmStockOption } from '@/lib/filmSearch'


/**
 * What choosing a development process already settles.
 *
 * Process, type and color balance overlap almost completely: a film developed
 * in B&W *is* a black and white film, and color balance is meaningless for
 * one. Asking for all three made the form demand two answers it already had —
 * pick B&W and it still wanted "Black & White" and "Not applicable (B&W)".
 *
 * Only black and white implies a colour balance, and it implies the absence of
 * one. The old free-text type this also carried is gone: the page derives that
 * phrase from chromaticity and polarity rather than storing a third spelling of
 * the same fact.
 */
const PROCESS_IMPLIES: Record<string, { colorBalance?: string }> = {
  'B&W': { colorBalance: 'N/A' },
}

/**
 * A value the form worked out rather than asked for.
 *
 * Shown rather than hidden: the reader still needs to know what will be saved,
 * and a field that silently fills itself in is its own kind of confusing.
 */
function DerivedField({ label, value, from }: { label: string; value: string; from: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className="flex h-[42px] items-center border border-neutral-700 bg-neutral-900/60 px-3 text-sm text-neutral-300"
        aria-readonly="true"
      >
        {value}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-600">{from}</p>
    </div>
  )
}

type SuggestEditModalProps = {
  type: 'camera' | 'filmstock'
  id: string
  name: string
  brand: string | null
  currentImage: string | null
  currentDescription: string | null
  // Camera props
  cameraType?: string | null
  format?: string | null
  year?: number | null
  defaultFilmStockId?: string | null
  // Film props
  iso?: number | null
  exposures?: string | null
  process?: string | null
  colorBalance?: string | null
  manufacturer?: string | null
  aliases?: string[]
  onClose: () => void
}

export default function SuggestEditModal({
  type,
  id,
  name,
  brand,
  currentImage,
  currentDescription,
  cameraType: initialCameraType,
  format: initialFormat,
  year: initialYear,
  defaultFilmStockId: initialDefaultFilmStockId,
  iso: initialIso,
  exposures: initialExposures,
  process: initialProcess,
  colorBalance: initialColorBalance,
  manufacturer: initialManufacturer,
  aliases: initialAliases,
  onClose
}: SuggestEditModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)
  // The name was the one thing the form could not change, so correcting a
  // misspelt film meant asking an administrator to open the database.
  const [editedName, setEditedName] = useState(name)
  const [editedBrand, setEditedBrand] = useState(brand || '')
  const [description, setDescription] = useState(currentDescription || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Camera fields
  const [cameraType, setCameraType] = useState(initialCameraType || '')
  const [format, setFormat] = useState(initialFormat || '')
  const [year, setYear] = useState(initialYear?.toString() || '')
  const [defaultFilmStockId, setDefaultFilmStockId] = useState(initialDefaultFilmStockId || '')
  const [filmStocks, setFilmStocks] = useState<FilmStockOption[]>([])

  // Film fields
  const [iso, setIso] = useState(initialIso?.toString() || '')
  const [exposures, setExposures] = useState(initialExposures || '')
  const [filmProcess, setFilmProcess] = useState(initialProcess || '')
  const [colorBalance, setColorBalance] = useState(initialColorBalance || '')
  const [manufacturer, setManufacturer] = useState(initialManufacturer || '')
  const [aliases, setAliases] = useState((initialAliases ?? []).join(', '))

  // Custom "Other" values
  const [customFormat, setCustomFormat] = useState('')

  const isDisposable = cameraType === 'DISPOSABLE' || initialCameraType === 'DISPOSABLE'

  // What this process settles on its own, if anything. "Other" and an unset
  // process settle nothing, so both fields are asked for as before.
  const implied = PROCESS_IMPLIES[filmProcess]

  /**
   * Choosing a process fills in what it implies.
   *
   * Written into state rather than only derived at submit time, so what the
   * form shows is what it will send — and so that switching away from B&W does
   * not leave "N/A" behind on a color film, which is how a stock ends up
   * filed under a balance that cannot apply to it.
   */
  const handleProcessChange = (value: string) => {
    setFilmProcess(value)
    const next = PROCESS_IMPLIES[value]
    if (!next) return
    if (next.colorBalance) setColorBalance(next.colorBalance)
    else if (colorBalance === 'N/A') setColorBalance('')
  }

  useEffect(() => {
    if (type === 'camera' && isDisposable) {
      fetch('/api/filmstocks')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setFilmStocks(data) })
        .catch(() => {})
    }
  }, [type, isDisposable])

  // Released when it is replaced and when the dialog closes, as NewItemModal
  // already does. Without it every picture chosen here stayed in memory for
  // the life of the page.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // The sign-in prompt stands in for the whole form, so only one of these two
  // overlays is ever on screen. Each gets its own call, keyed to the condition
  // that renders it, so the one that is not showing does not lock the page.
  const signInPanelRef = useDialogBehavior({ open: !session, onClose })
  const panelRef = useDialogBehavior({ open: !!session, onClose })

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div
          ref={signInPanelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggest-edit-signin-title"
          className="bg-neutral-900 border border-neutral-800 p-8 max-w-md w-full focus:outline-none"
        >
          <h2 id="suggest-edit-signin-title" className="text-xl font-bold text-white mb-4">Sign in required</h2>
          <p className="text-neutral-400 mb-6">
            You need to sign in to suggest edits.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/login')} fullWidth>
              Sign in
            </Button>
            <Button onClick={onClose} variant="secondary" fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    // Check if any changes were made
    const descriptionChanged = description !== currentDescription
    const trimmedName = editedName.trim()
    const trimmedBrand = editedBrand.trim()
    const nameChanged = trimmedName !== name || (type === 'camera' && trimmedBrand !== (brand || ''))

    // Each field against the value it was opened with, the way the name above
    // is already checked. Testing them for truthiness instead asked "is this
    // field filled in", which on an already-categorized record is yes for all
    // of them: changing only the description proposed the body type, the
    // format, the year and the aliases as edits too, and a reviewer had to
    // adjudicate five fields nobody had touched.
    // Checked before the no-changes test below, which would otherwise answer
    // "make some changes" to someone who picked Other and left the box empty.
    if (format === 'Other' && !customFormat.trim()) {
      toast('Please specify the custom format', 'error')
      return
    }

    const finalFormat = format === 'Other' ? customFormat.trim() : format
    const changedFields: Array<[string, string]> = (
      type === 'camera'
        ? [
            ['bodyType', cameraType, initialCameraType || ''],
            ['format', finalFormat, initialFormat || ''],
            ['year', year, initialYear?.toString() || ''],
            ['defaultFilmStockId', defaultFilmStockId, initialDefaultFilmStockId || ''],
            ['aliases', aliases.trim(), (initialAliases ?? []).join(', ')],
          ]
        : [
            ['format', finalFormat, initialFormat || ''],
            ['iso', iso, initialIso?.toString() || ''],
            ['exposures', exposures.trim(), initialExposures || ''],
            ['process', filmProcess, initialProcess || ''],
            ['colorBalance', colorBalance, initialColorBalance || ''],
            ['manufacturer', manufacturer.trim(), initialManufacturer || ''],
            ['aliases', aliases.trim(), (initialAliases ?? []).join(', ')],
          ]
    )
      .filter(([, value, initial]) => value !== initial)
      .map(([key, value]) => [key, value])

    if (!imageFile && !descriptionChanged && !nameChanged && changedFields.length === 0) {
      toast('Please make some changes to submit', 'error')
      return
    }

    // Emptying the name would leave the record with nothing to be called and
    // no slug to live at, so it is refused here rather than at the database.
    if (!trimmedName) {
      toast('Please give this a name', 'error')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      if (imageFile) {
        formData.append('image', imageFile)
      }
      formData.append('description', description)

      // Only when it actually changed: the handler treats every field it
      // receives as a proposed edit, and sending the unchanged name would put
      // a no-op rename in front of a reviewer.
      if (trimmedName !== name) formData.append('name', trimmedName)

      // Add categorization fields with "Other" handling
      if (type === 'camera') {
        if (trimmedBrand !== (brand || '')) formData.append('brand', trimmedBrand)
      }
      // Only what actually changed. The key has to be the column name: the
      // handler reads the fields it accepts by name, so 'cameraType' was
      // collected by nothing and a contributor changing only the body type got
      // "No changes detected".
      for (const [key, value] of changedFields) formData.append(key, value)

      const endpoint = type === 'camera' ? `/api/cameras/${id}/image` : `/api/filmstocks/${id}/image`
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      toast(data.message || 'Edit submitted for review', 'success')
      onClose()

      // Refresh the page data without full reload
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast(error instanceof Error ? error.message : 'Failed to submit edit', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-6">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggest-edit-title"
        className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl my-4 md:my-8 focus:outline-none"
      >
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 id="suggest-edit-title" className="text-xl md:text-2xl font-bold text-white">Suggest Edit</h2>
              <p className="text-neutral-500 text-sm mt-1">
                {brand ? `${brand} ${name}` : name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-4 flex-shrink-0 text-neutral-500 hover:text-white
                         focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2
                         focus-visible:outline-[#D32F2F]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 md:space-y-6">
          {/* Current Image */}
          {currentImage && (
            <div>
              <FieldLabel>Current image</FieldLabel>
              <div className="relative aspect-square w-full max-w-[200px] md:max-w-xs bg-neutral-800">
                <Image
                  src={currentImage}
                  alt={name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* New Image Upload */}
          <div>
            <FieldLabel>
              {currentImage ? 'Replace Image' : 'Upload Image'}
            </FieldLabel>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-xs md:text-sm text-neutral-400
                file:mr-2 md:file:mr-3 file:py-2 file:px-3
                file:border-0 file:text-xs md:file:text-sm file:font-medium
                file:bg-neutral-800 file:text-white
                hover:file:bg-neutral-700"
            />
            <p className="text-xs text-neutral-600 mt-1">
              PNG with transparent background recommended
            </p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <FieldLabel>Preview</FieldLabel>
              <div className="relative aspect-square w-full max-w-[200px] md:max-w-xs bg-neutral-800">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={type === 'camera' ? '' : 'sm:col-span-2'}>
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder={type === 'camera' ? 'e.g. AE-1 Program' : 'e.g. HP5 Plus 400'}
                maxLength={120}
                className={fieldClass}
              />
              <p className="mt-1.5 text-[11px] text-neutral-600">
                Renaming moves this page to a new address. The old one keeps working.
              </p>
            </div>
            {type === 'camera' && (
              <div>
                <FieldLabel>Brand</FieldLabel>
                <input
                  type="text"
                  value={editedBrand}
                  onChange={(e) => setEditedBrand(e.target.value)}
                  placeholder="e.g. Canon"
                  maxLength={60}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <FieldLabel>
              Description
            </FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Tell users about this ${type}…`}
              className={`${fieldClassMultiline} resize-none`}
              rows={4}
            />
          </div>

          {/* Camera Categorization Fields */}
          {type === 'camera' && (
            <div className="bg-neutral-800 border border-neutral-800">
              <div className="border-b border-neutral-700 px-4 py-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Camera Details</h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Body type</FieldLabel>
                    <select
                      value={cameraType}
                      onChange={(e) => setCameraType(e.target.value)}
                      className={`${fieldClass}`}
                    >
                      {/* No "Other". Leaving it unset is the answer for a body
                          the list does not cover — it reaches a reviewer as an
                          unclassified camera rather than as a wrong one, which
                          is how the Sprocket Rocket became a point & shoot. */}
                      <option value="">Not sure / not listed</option>
                      {BODY_TYPES.map((t) => (
                        <option key={t} value={t}>{BODY_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-neutral-600">
                      How the body works. If none of these fit, leave it blank
                      and say so in the description.
                    </p>
                  </div>

                  <div>
                    <FieldLabel>Format</FieldLabel>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className={`${fieldClass}`}
                    >
                      <option value="">Select format…</option>
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {format === 'Other' && (
                      <input
                        type="text"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        placeholder="e.g. 127"
                        className={`${fieldClass} mt-2`}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <FieldLabel>Also known as</FieldLabel>
                  <input
                    type="text"
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    placeholder="Infinity Stylus, Stylus Zoom 105"
                    className={`${fieldClass}`}
                  />
                  <p className="text-[11px] text-neutral-600 mt-1.5">
                    Names this body is sold under elsewhere, separated by commas.
                    Search finds it under any of them.
                  </p>
                </div>

                <div>
                  <FieldLabel>Year released</FieldLabel>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="1990"
                    min="1800"
                    max={new Date().getFullYear()}
                    className={`${fieldClass}`}
                  />
                </div>

                {isDisposable && filmStocks.length > 0 && (
                  <div>
                    <FieldLabel>Preloaded film</FieldLabel>
                    <select
                      value={defaultFilmStockId}
                      onChange={(e) => setDefaultFilmStockId(e.target.value)}
                      className={`${fieldClass}`}
                    >
                      <option value="">Select film stock…</option>
                      {filmStocks.map((fs) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.brand ? `${fs.brand} ${fs.name}` : fs.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Film Categorization Fields */}
          {type === 'filmstock' && (
            <div className="bg-neutral-800 border border-neutral-800">
              <div className="border-b border-neutral-700 px-4 py-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Film Details</h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Process</FieldLabel>
                    <select
                      value={filmProcess}
                      onChange={(e) => handleProcessChange(e.target.value)}
                      className={`${fieldClass}`}
                    >
                      <option value="">Select process…</option>
                      {FILM_PROCESSES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-neutral-600">
                      How the film is developed. This fills in the fields it decides.
                    </p>
                  </div>

                  {/* Color balance does not apply to black and white, so it is
                      stated rather than asked. */}
                  {implied?.colorBalance ? (
                    <DerivedField
                      label="Color balance"
                      value="Not applicable"
                      from="Black and white film has no color balance."
                    />
                  ) : (
                    <div>
                      <FieldLabel>Color balance</FieldLabel>
                      <select
                        value={colorBalance}
                        onChange={(e) => setColorBalance(e.target.value)}
                        className={`${fieldClass}`}
                      >
                        <option value="">Unknown</option>
                        {/* N/A is not offered here: it means "black and white",
                            which is the process, not a choice to make twice. */}
                        {COLOR_BALANCES.filter((b) => b !== 'N/A').map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <FieldLabel>Manufacturer</FieldLabel>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. Kodak"
                      className={`${fieldClass}`}
                    />
                  </div>
                  <div>
                    <FieldLabel>
                      Also known as
                    </FieldLabel>
                    <input
                      type="text"
                      value={aliases}
                      onChange={(e) => setAliases(e.target.value)}
                      placeholder="5219, 7219, VISION3 500T"
                      className={`${fieldClass}`}
                    />
                    <p className="text-[11px] text-neutral-600 mt-1.5">
                      Alternate names and product codes, separated by commas
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Format</FieldLabel>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className={`${fieldClass}`}
                    >
                      <option value="">Select format…</option>
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {format === 'Other' && (
                      <input
                        type="text"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        placeholder="e.g. 127"
                        className={`${fieldClass} mt-2`}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>ISO speed</FieldLabel>
                    <input
                      type="number"
                      value={iso}
                      onChange={(e) => setIso(e.target.value)}
                      placeholder="400"
                      min="1"
                      className={`${fieldClass}`}
                    />
                  </div>
                  <div>
                    <FieldLabel>Exposures</FieldLabel>
                    <input
                      type="text"
                      value={exposures}
                      onChange={(e) => setExposures(e.target.value)}
                      placeholder="36"
                      className={`${fieldClass}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-neutral-800 border border-neutral-700 p-3 md:p-4">
            <p className="text-xs md:text-sm text-neutral-400">
              <strong className="text-white">Note:</strong> Your edit will be reviewed by admins before going live.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmit}
              disabled={uploading} className="flex-1">
              {uploading ? 'Submitting…' : 'Submit for Review'}
            </Button>
            <Button onClick={onClose} disabled={uploading} variant="secondary">
              Cancel
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

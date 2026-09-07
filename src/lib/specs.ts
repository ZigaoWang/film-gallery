import type {
  Camera,
  ExposureMode,
  FilmBase,
  FilmStock,
  FlashFitting,
  FocusType,
  MeteringPattern,
  ShutterType,
} from '@prisma/client'

/**
 * A catalog record's specifications, as rows a page can print.
 *
 * The chips along the top answer "what is this": type, format, mount, year.
 * They are the identity, they fit on one line, and there are five of them. The
 * rest of what a camera is - the lens, the shutter, the meter, the battery -
 * is a different question with a different shape, and cramming it into the same
 * strip would produce thirty chips nobody reads.
 *
 * So this returns grouped rows instead. Each carries the field name it came
 * from, which is what lets the page hang that field's own citation beside that
 * field's own value. The provenance table has always been keyed per field; it
 * simply had almost no fields to key on.
 *
 * A row is produced only when there is something to say. An entry that has had
 * no research done shows no table rather than a page of "not recorded", which
 * is the same rule the spec chips already follow.
 */

export interface SpecRow {
  /** The column this came from, so a citation can be looked up for it. */
  field: string
  label: string
  value: string
}

export interface SpecGroup {
  title: string
  rows: SpecRow[]
}

const FOCUS_LABELS: Record<FocusType, string> = {
  FIXED: 'Fixed focus',
  ZONE: 'Zone focus',
  SCALE: 'Scale focus',
  RANGEFINDER: 'Coupled rangefinder',
  SLR_MANUAL: 'Manual, through the lens',
  AUTOFOCUS: 'Autofocus',
}

const METERING_LABELS: Record<MeteringPattern, string> = {
  NONE: 'No meter',
  AVERAGE: 'Averaging',
  CENTER_WEIGHTED: 'Center weighted',
  SPOT: 'Spot',
  MULTI_ZONE: 'Multi-zone',
}

const EXPOSURE_LABELS: Record<ExposureMode, string> = {
  PROGRAM: 'Program',
  APERTURE_PRIORITY: 'Aperture priority',
  SHUTTER_PRIORITY: 'Shutter priority',
  MANUAL: 'Manual',
}

const SHUTTER_LABELS: Record<ShutterType, string> = {
  LEAF: 'Leaf',
  FOCAL_PLANE: 'Focal plane',
  ELECTRONIC: 'Electronic',
}

const FLASH_LABELS: Record<FlashFitting, string> = {
  NONE: 'None',
  BUILT_IN: 'Built in',
  HOT_SHOE: 'Hot shoe',
  BUILT_IN_AND_HOT_SHOE: 'Built in, plus a hot shoe',
}

const BASE_LABELS: Record<FilmBase, string> = {
  ACETATE: 'Acetate',
  POLYESTER: 'Polyester',
  PET: 'PET',
}

/**
 * A shutter speed as photographers write it.
 *
 * Stored in seconds so the two ends of a range sort against each other and
 * against other bodies, which is the whole reason not to store "1/1200" as
 * text. Printed back as the fraction everyone actually reads.
 */
export function shutterLabel(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || seconds <= 0) return null
  if (seconds >= 1) return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`
  return `1/${Math.round(1 / seconds)}`
}

/** "38 to 115mm", or "35mm" when the two ends agree. */
function focalLabel(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  if (min && max && min !== max) return `${min} to ${max}mm`
  return `${min ?? max}mm`
}

/** "f/3.6 to f/8.5", or "f/1.7" for a prime. */
function apertureLabel(wide: number | null, tele: number | null): string | null {
  if (!wide && !tele) return null
  if (wide && tele && wide !== tele) return `f/${wide} to f/${tele}`
  return `f/${wide ?? tele}`
}

/** Millimetres in, metres out, because that is how a focus scale is read. */
function distanceLabel(mm: number | null | undefined): string | null {
  if (!mm) return null
  return mm >= 1000 ? `${(mm / 1000).toFixed(mm % 1000 === 0 ? 0 : 1)}m` : `${(mm / 1000).toFixed(2)}m`
}

function range(min: number | null, max: number | null, unit = ''): string | null {
  if (!min && !max) return null
  if (min && max) return `${min} to ${max}${unit}`
  return `${min ?? max}${unit}`
}

/** Drops the rows with nothing in them, and the groups left empty by that. */
function compact(groups: Array<{ title: string; rows: Array<SpecRow | null> }>): SpecGroup[] {
  return groups
    .map(g => ({ title: g.title, rows: g.rows.filter((r): r is SpecRow => r !== null) }))
    .filter(g => g.rows.length > 0)
}

const row = (field: string, label: string, value: string | null): SpecRow | null =>
  value ? { field, label, value } : null

export type CameraSpecRecord = Pick<
  Camera,
  | 'lensName' | 'focalMinMm' | 'focalMaxMm' | 'apertureMaxWide' | 'apertureMaxTele'
  | 'lensElements' | 'lensGroups' | 'closeFocusMm' | 'focusType' | 'meteringPattern'
  | 'exposureModes' | 'shutterType' | 'shutterSlowestSec' | 'shutterFastestSec'
  | 'filmSpeedMin' | 'filmSpeedMax' | 'flash' | 'batteryType' | 'weightGrams'
>

export function cameraSpecGroups(camera: CameraSpecRecord): SpecGroup[] {
  return compact([
    {
      title: 'Lens',
      rows: [
        row('lensName', 'Name', camera.lensName),
        row('focalMinMm', 'Focal length', focalLabel(camera.focalMinMm, camera.focalMaxMm)),
        row('apertureMaxWide', 'Maximum aperture', apertureLabel(camera.apertureMaxWide, camera.apertureMaxTele)),
        row(
          'lensElements',
          'Construction',
          camera.lensElements && camera.lensGroups
            ? `${camera.lensElements} elements in ${camera.lensGroups} groups`
            : camera.lensElements
              ? `${camera.lensElements} elements`
              : null
        ),
        row('closeFocusMm', 'Closest focus', distanceLabel(camera.closeFocusMm)),
      ],
    },
    {
      title: 'Exposure',
      rows: [
        row('focusType', 'Focusing', camera.focusType ? FOCUS_LABELS[camera.focusType] : null),
        row('meteringPattern', 'Metering', camera.meteringPattern ? METERING_LABELS[camera.meteringPattern] : null),
        row(
          'exposureModes',
          'Modes',
          camera.exposureModes.length ? camera.exposureModes.map(m => EXPOSURE_LABELS[m]).join(', ') : null
        ),
        row('shutterType', 'Shutter', camera.shutterType ? SHUTTER_LABELS[camera.shutterType] : null),
        row(
          'shutterSlowestSec',
          'Speeds',
          (() => {
            const slow = shutterLabel(camera.shutterSlowestSec)
            const fast = shutterLabel(camera.shutterFastestSec)
            if (slow && fast) return `${slow} to ${fast}`
            return slow ?? fast
          })()
        ),
        row('filmSpeedMin', 'Film speed', range(camera.filmSpeedMin, camera.filmSpeedMax) &&
          `ISO ${range(camera.filmSpeedMin, camera.filmSpeedMax)}`),
      ],
    },
    {
      title: 'Body',
      rows: [
        row('flash', 'Flash', camera.flash ? FLASH_LABELS[camera.flash] : null),
        row('batteryType', 'Battery', camera.batteryType),
        row('weightGrams', 'Weight', camera.weightGrams ? `${camera.weightGrams}g` : null),
      ],
    },
  ])
}

export type FilmSpecRecord = Pick<
  FilmStock,
  | 'rmsGranularity' | 'resolvingPowerLpmm' | 'baseMaterial' | 'hasRemjet'
  | 'latitudeUnderStops' | 'latitudeOverStops'
>

export function filmSpecGroups(film: FilmSpecRecord): SpecGroup[] {
  return compact([
    {
      title: 'Measured',
      rows: [
        row('rmsGranularity', 'Granularity', film.rmsGranularity ? `RMS ${film.rmsGranularity}` : null),
        row(
          'resolvingPowerLpmm',
          'Resolving power',
          film.resolvingPowerLpmm ? `${film.resolvingPowerLpmm} lines/mm` : null
        ),
        row(
          'latitudeUnderStops',
          'Exposure latitude',
          film.latitudeUnderStops || film.latitudeOverStops
            ? [
                film.latitudeUnderStops ? `${film.latitudeUnderStops} under` : null,
                film.latitudeOverStops ? `${film.latitudeOverStops} over` : null,
              ]
                .filter(Boolean)
                .join(', ') + ' stops'
            : null
        ),
      ],
    },
    {
      title: 'Stock',
      rows: [
        row('baseMaterial', 'Base', film.baseMaterial ? BASE_LABELS[film.baseMaterial] : null),
        // Only worth a row when it is true. "No remjet" is the ordinary case
        // for a still film and says nothing a reader needs told.
        row('hasRemjet', 'Backing', film.hasRemjet ? 'Remjet, so it needs ECN-2' : null),
      ],
    },
  ])
}

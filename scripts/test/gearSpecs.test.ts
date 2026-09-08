/**
 * The chips on a gear card are derived from the record, not chosen per page.
 *
 * The card was already one shared component, and it still managed to render
 * differently in each of the three places it was used: the pairing page listed
 * four facts a side, the photo page gave a film its ISO and gave a camera
 * nothing at all. Two cards sat under every photograph looking like different
 * components. Sharing markup without sharing the vocabulary that fills it is
 * the half of the job that does not show up in a diff.
 *
 * These check the properties that made that visible, rather than the exact
 * strings, which are a design decision and are allowed to change:
 *
 *  - a fully recorded camera and a fully recorded film both produce chips, so
 *    neither side of the pair can come out bare
 *  - a value the page suppresses stays suppressed, since those rules were the
 *    reason each page had its own list to begin with
 *
 *   npx tsx scripts/test/gearSpecs.test.ts
 */
import { cameraSpecs } from '../../src/lib/cameraFields'
import { filmSpecs } from '../../src/lib/filmFields'

let pass = 0
let fail = 0

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    pass++
    console.log(`  PASS ${name}`)
  } else {
    fail++
    console.error(`  FAIL ${name}${detail ? `: ${detail}` : ''}`)
  }
}

const SNAPIC = {
  bodyType: 'COMPACT' as const,
  frameFormat: 'FULL_FRAME' as const,
  format: '35mm',
  mountType: null,
  year: 2025,
}

const GOLD_200 = {
  iso: 200,
  process: 'C41' as const,
  colorBalance: 'DAYLIGHT' as const,
  format: ['35mm'],
}

console.log('a recorded camera and a recorded film both fill their card')
{
  const camera = cameraSpecs(SNAPIC)
  const film = filmSpecs(GOLD_200)
  check('the camera is not bare', camera.length > 0, 'no chips')
  check('the film is not bare', film.length > 0, 'no chips')
  // The pair sits side by side under a photograph. One with four chips and one
  // with none is the state this exists to prevent, so they are required to be
  // within one of each other rather than merely both non-empty.
  check(
    'neither side dwarfs the other',
    Math.abs(camera.length - film.length) <= 1,
    `camera ${camera.length} (${camera.join(', ')}) vs film ${film.length} (${film.join(', ')})`
  )
}

console.log('a fixed lens is an answer, not a blank')
{
  const chips = cameraSpecs(SNAPIC)
  check('a compact says its lens is fixed', chips.includes('Fixed lens'), chips.join(', '))
  check(
    'a body that could take lenses says nothing until it is known',
    !cameraSpecs({ bodyType: 'SLR', format: '35mm' }).includes('Fixed lens')
  )
  check(
    'a recorded mount is printed as recorded',
    cameraSpecs({ bodyType: 'SLR', mountType: 'Canon FD' }).includes('Canon FD')
  )
  // A mount used by exactly one body is named after it, so the XPan carried a
  // chip reading "Hasselblad XPan" directly under a heading reading
  // "Hasselblad XPan". The record keeps the mount either way.
  check(
    'a mount the name already says is not repeated as a chip',
    !cameraSpecs({
      name: 'Hasselblad XPan',
      bodyType: 'RANGEFINDER',
      mount: { name: 'Hasselblad XPan' },
    }).includes('Hasselblad XPan')
  )
  check(
    'a mount the name does not say is still printed',
    cameraSpecs({
      name: 'Canon AE-1 Program',
      bodyType: 'SLR',
      mount: { name: 'Canon FD' },
    }).includes('Canon FD')
  )
}

console.log('what the pages suppress stays suppressed')
{
  // Nearly every 35mm body is full frame, so printing it on all of them is
  // noise. The camera page omits it and the card has to agree.
  check('full frame is not worth a chip', !cameraSpecs(SNAPIC).includes('Full frame'), cameraSpecs(SNAPIC).join(', '))
  check(
    'a frame that is not the ordinary one is',
    cameraSpecs({ bodyType: 'RANGEFINDER', frameFormat: 'PANORAMIC' }).includes('Panoramic')
  )
  // "Not applicable" is not a specification. A black and white stock printing
  // N/A beside its speed answers a question nobody asked of it.
  check(
    'a monochrome stock does not print N/A',
    !filmSpecs({ iso: 400, process: 'BW', colorBalance: 'NA', format: ['35mm'] }).includes('N/A'),
    filmSpecs({ iso: 400, process: 'BW', colorBalance: 'NA', format: ['35mm'] }).join(', ')
  )
}

console.log('an empty record produces an empty list, not a list of empties')
{
  check('no camera chips', cameraSpecs({}).length === 0, cameraSpecs({}).join(', '))
  check('no film chips', filmSpecs({}).length === 0, filmSpecs({}).join(', '))
  check(
    'nothing blank slips through',
    [...cameraSpecs(SNAPIC), ...filmSpecs(GOLD_200)].every(s => s.trim().length > 0)
  )
}

console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)

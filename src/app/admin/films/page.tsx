import ResourceTable from '../ResourceTable'

/**
 * Uncited is the working queue. The public pages mark what has a source,
 * because a visitor wants to know what has been checked; this marks what has
 * none, because the person maintaining the catalog wants the opposite.
 */
const FILTERS = [{ value: 'uncited', label: 'Uncited' }] as const

export default function Page() {
  return <ResourceTable resource="films" filters={FILTERS} />
}

import ResourceTable from '../ResourceTable'

/**
 * Open is the queue, the way it is on feedback. The overview links here to
 * review open reports and used to land on every report ever filed, with the
 * open ones somewhere down the list. Resolved and dismissed stay under All.
 */
const FILTERS = [{ value: 'open', label: 'Open' }] as const

export default function Page() {
  return <ResourceTable resource="reports" filters={FILTERS} defaultFilter="open" />
}

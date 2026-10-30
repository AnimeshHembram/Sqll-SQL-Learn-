import { useLocation, useNavigate } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { Button } from '../components/ui/Button.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'

/** React Router stores the history position in `history.state.idx`; 0 means this is the first entry. */
function hasPreviousEntry(): boolean {
  const state = window.history.state as { idx?: number } | null
  return (state?.idx ?? 0) > 0
}

export function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <PageHeader
      title="Page not found"
      description={`There is no page at ${pathname}. Check the address, or use the navigation to find what you need.`}
      actions={
        <>
          <Button to={NAV.dashboard.path}>Go to dashboard</Button>
          {hasPreviousEntry() && (
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Go back
            </Button>
          )}
        </>
      }
    />
  )
}

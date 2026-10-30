import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '../components/ui/Button.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import styles from './RouteErrorPage.module.css'

interface RouteErrorPageProps {
  /** True when rendered without the app shell (the shell itself failed). */
  standalone?: boolean
}

/** Shown when a page throws while rendering. */
export function RouteErrorPage({ standalone = false }: RouteErrorPageProps) {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null

  return (
    <div className={standalone ? styles.standalone : undefined}>
      <PageHeader
        title="This page could not be displayed"
        description="Reload the page to try again. If the problem continues, go back to the dashboard."
        actions={
          <>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            {/* A plain link, so it works even if the router is in a broken state. */}
            <a href="/" className={styles.homeLink}>
              Go to dashboard
            </a>
          </>
        }
      />
      {detail && <p className={styles.detail}>Error details: {detail}</p>}
    </div>
  )
}

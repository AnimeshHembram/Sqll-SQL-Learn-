import { NAV } from '../app/navigation.ts'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'

export function ReferencePage() {
  return (
    <>
      <PageHeader title={NAV.reference.title} description={NAV.reference.description} />
      <Card title="Statements">
        <EmptyState title="The reference is not available yet">
          Entries for SELECT, JOIN, GROUP BY and other statements will be listed here, each linked
          to the lesson that teaches it.
        </EmptyState>
      </Card>
    </>
  )
}

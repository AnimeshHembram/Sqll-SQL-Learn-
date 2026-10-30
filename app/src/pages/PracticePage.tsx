import { NAV } from '../app/navigation.ts'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'

export function PracticePage() {
  return (
    <>
      <PageHeader title={NAV.practice.title} description={NAV.practice.description} />
      <Card title="Practice space">
        <EmptyState title="Practice is not available yet">
          You will be able to write queries against sample databases and see the results straight
          away, without installing anything.
        </EmptyState>
      </Card>
    </>
  )
}

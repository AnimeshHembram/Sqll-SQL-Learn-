import { NAV } from '../app/navigation.ts'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'

export function ChallengesPage() {
  return (
    <>
      <PageHeader title={NAV.challenges.title} description={NAV.challenges.description} />
      <Card title="All challenges">
        <EmptyState title="No challenges yet">
          Each challenge will ask a question about a sample database and check the result of your
          query.
        </EmptyState>
      </Card>
    </>
  )
}

import { NAV } from '../app/navigation.ts'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'

export function LearnPage() {
  return (
    <>
      <PageHeader title={NAV.learn.title} description={NAV.learn.description} />
      <Card title="Modules">
        <EmptyState title="Lessons are not available yet">
          The first module, SQL fundamentals, will cover SELECT, WHERE, ORDER BY and LIMIT.
        </EmptyState>
      </Card>
    </>
  )
}

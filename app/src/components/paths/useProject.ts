import { useEffect, useMemo, useState } from 'react'
import { loadProjectText } from '../../content/paths/projects.ts'
import type { PathProjectSummary, ProjectText } from '../../content/types.ts'
import type { TableInfo } from '../../features/sql/protocol.ts'
import { challengeEngine, type EngineState } from '../../features/sql/sqlEngine.ts'

export type ProjectTextState = { text: ProjectText } | { failed: true } | null

/**
 * What both project pages need: the project's brief and task text (loaded once per project) and
 * the tables of the project's own dataset (read from a fresh copy in the worker, which loads the
 * dataset the first time). `engine` is the challenge engine's state, which each page reads itself.
 */
export function useProject(project: PathProjectSummary, engine: EngineState) {
  const engineUsable = engine.sqliteVersion !== null && engine.status !== 'failed'
  const [text, setText] = useState<ProjectTextState>(null)
  const [attempt, setAttempt] = useState(0)
  const [tables, setTables] = useState<TableInfo[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadProjectText(project).then(
      (loaded) => {
        if (!cancelled) setText({ text: loaded })
      },
      () => {
        if (!cancelled) setText({ failed: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [project, attempt])

  useEffect(() => {
    void challengeEngine.start().catch(() => {
      // Reported through engine state ("failed").
    })
  }, [])

  useEffect(() => {
    if (!engineUsable || tables) return
    let cancelled = false
    challengeEngine.schema(project.dataset).then(
      (result) => {
        if (!cancelled) setTables(result)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [engineUsable, tables, project.dataset])

  const schema = useMemo(
    () => Object.fromEntries((tables ?? []).map((table) => [table.name, table.columns.map((column) => column.name)])),
    [tables],
  )

  return {
    engineUsable,
    text,
    retryText: () => {
      setText(null)
      setAttempt((count) => count + 1)
    },
    tables,
    schema,
  }
}

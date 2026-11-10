import { readStored, writeStored } from '../../lib/storage.ts'
import { parseDrafts, withDraft, type DraftMap } from './pathDraftsModel.ts'

/**
 * Unsubmitted queries in SQL Path exercises and daily problems, kept in this
 * browser so a learner who leaves a page (or reloads it) finds their query
 * where they left it. A convenience only: drafts are not progress, are never
 * exported, and losing them (blocked storage, "Delete all saved data") costs
 * nothing that was submitted.
 */

const KEY = 'path-drafts:v1'
let cache: DraftMap | null = null

function drafts(): DraftMap {
  cache ??= parseDrafts(readStored(KEY))
  return cache
}

/** The saved draft for an exercise or problem, or null if there is none. */
export function savedDraft(id: string): string | null {
  return drafts()[id]?.sql ?? null
}

/** Saves the editor's content; pass null when it is back to the starter query. */
export function saveDraft(id: string, sql: string | null): void {
  cache = withDraft(drafts(), id, sql, Date.now())
  writeStored(KEY, cache)
}

/** Forgets the in-memory copy, for example after "Delete all saved data". */
export function reloadDrafts(): void {
  cache = null
}

/**
 * Pure rules for saved exercise drafts (see pathDrafts.ts). No browser access,
 * so npm run test:paths can run them in Node.
 */

/** Drafts longer than this are not saved; no exercise needs a query this long. */
export const MAX_DRAFT_LENGTH = 20_000
/** Only the most recently edited drafts are kept, so storage cannot grow without limit. */
export const MAX_DRAFTS = 200

export interface DraftEntry {
  sql: string
  /** Milliseconds since 1970, used to drop the oldest drafts. */
  savedAt: number
}
export type DraftMap = Record<string, DraftEntry>

/** Accepts only well-formed entries, so damaged or hand-edited storage is ignored rather than trusted. */
export function parseDrafts(value: unknown): DraftMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const drafts: DraftMap = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== 'object' || entry === null) continue
    const { sql, savedAt } = entry as Record<string, unknown>
    if (typeof sql === 'string' && sql.length <= MAX_DRAFT_LENGTH && typeof savedAt === 'number' && Number.isFinite(savedAt)) {
      drafts[id] = { sql, savedAt }
    }
  }
  return drafts
}

/** Returns a new map with the draft set (or removed when `sql` is null), keeping at most MAX_DRAFTS entries. */
export function withDraft(drafts: DraftMap, id: string, sql: string | null, now: number): DraftMap {
  const next: DraftMap = { ...drafts }
  if (sql === null || sql.length > MAX_DRAFT_LENGTH) delete next[id]
  else next[id] = { sql, savedAt: now }
  const ids = Object.keys(next)
  if (ids.length > MAX_DRAFTS) {
    ids
      .sort((a, b) => next[a].savedAt - next[b].savedAt)
      .slice(0, ids.length - MAX_DRAFTS)
      .forEach((old) => delete next[old])
  }
  return next
}

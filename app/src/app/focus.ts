/** Id of each page's <h1>. Focus moves here after client-side navigation. */
export const PAGE_TITLE_ID = 'page-title'

/** Id of the <main> element, the target of the skip link. */
export const MAIN_CONTENT_ID = 'main-content'

export function focusElementById(id: string): void {
  document.getElementById(id)?.focus()
}

/**
 * Set when focus should move to the page heading but the page has not rendered
 * yet (a lazily loaded page is still loading). The heading takes focus when it mounts.
 */
let titleFocusPending = false

/** Moves focus to the page heading now, or as soon as it appears. */
export function focusPageTitle(): void {
  const title = document.getElementById(PAGE_TITLE_ID)
  titleFocusPending = title === null
  title?.focus()
}

/** Called by the page heading when it mounts. Returns true once if focus was waiting for it. */
export function takePendingTitleFocus(): boolean {
  const pending = titleFocusPending
  titleFocusPending = false
  return pending
}

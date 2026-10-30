/** Id of each page's <h1>. Focus moves here after client-side navigation. */
export const PAGE_TITLE_ID = 'page-title'

/** Id of the <main> element, the target of the skip link. */
export const MAIN_CONTENT_ID = 'main-content'

export function focusElementById(id: string): void {
  document.getElementById(id)?.focus()
}

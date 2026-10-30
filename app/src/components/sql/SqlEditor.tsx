import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { sql, SQLite } from '@codemirror/lang-sql'
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'
import styles from './SqlEditor.module.css'

/** Colours come from the design tokens, so light and dark themes both work. */
const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--code-keyword)', fontWeight: '600' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--code-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-number)' },
  { tag: [tags.lineComment, tags.blockComment], color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [tags.standard(tags.name), tags.typeName], color: 'var(--code-function)' },
])

const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface)',
    fontSize: 'var(--text-md)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: 'var(--space-3) 0', caretColor: 'var(--color-text)' },
  '.cm-cursor': { borderLeftColor: 'var(--color-text)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--code-gutter)',
    border: 'none',
    borderRight: '1px solid var(--color-border)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--color-surface-muted)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgb(40 82 196 / 0.2)',
  },
  '.cm-placeholder': { color: 'var(--color-text-muted)' },
  '.cm-tooltip': {
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
  },
})

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  /** Called on Ctrl+Enter (Cmd+Enter on macOS). */
  onRun: () => void
  /** Accessible name of the editing area. */
  label: string
  /** Table name → column names, for autocompletion. */
  schema?: Record<string, string[]>
}

/**
 * SQL editor built on CodeMirror 6: highlighting, line numbers, undo history,
 * bracket matching and completion of keywords, tables and columns.
 *
 * Keyboard: Tab is left to the browser so focus can move out of the editor;
 * Ctrl+Enter / Cmd+Enter runs the query.
 */
export function SqlEditor({ value, onChange, onRun, label, schema }: SqlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const languageRef = useRef(new Compartment())
  // Keep the latest callbacks without recreating the editor.
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  useEffect(() => {
    onChangeRef.current = onChange
    onRunRef.current = onRun
  })

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          languageRef.current.of(sql({ dialect: SQLite, upperCaseKeywords: true })),
          syntaxHighlighting(highlightStyle),
          editorTheme,
          placeholder('Write a SQL query, for example: SELECT * FROM books;'),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label, 'aria-multiline': 'true' }),
          keymap.of([
            {
              key: 'Mod-Enter',
              preventDefault: true,
              run: () => {
                onRunRef.current()
                return true
              },
            },
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // The editor is created once; later value and schema changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply outside changes (Clear, an example opened from a lesson, a table query).
  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  // Update autocompletion when the database's tables change.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageRef.current.reconfigure(sql({ dialect: SQLite, upperCaseKeywords: true, schema })),
    })
  }, [schema])

  return <div ref={hostRef} className={styles.editor} />
}

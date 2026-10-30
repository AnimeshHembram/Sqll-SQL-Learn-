import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ContentLesson } from '../../content/types.ts'
import { ExampleRunner } from './ExampleRunner.tsx'
import { Prose } from './Prose.tsx'

interface LessonBodyProps {
  lesson: ContentLesson
}

/**
 * The lesson text, with Run controls added under each runnable example.
 *
 * The HTML from the build stays exactly as rendered; a small host element is
 * appended inside each `<figure data-example>` and the controls are rendered
 * into it with a portal, so they keep the app's router and state.
 */
export function LessonBody({ lesson }: LessonBodyProps) {
  const [hosts, setHosts] = useState<HTMLElement[]>([])

  const attachRunners = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return
      const created = Array.from(container.querySelectorAll<HTMLElement>('figure[data-example]')).map((figure) => {
        const host = document.createElement('div')
        figure.append(host)
        return host
      })
      setHosts(created)
      return () => created.forEach((host) => host.remove())
    },
    // Re-attach when the HTML changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson.html],
  )

  return (
    <>
      <Prose html={lesson.html} ref={attachRunners} />
      {hosts.map((host, index) => {
        const example = lesson.examples[index]
        return example ? createPortal(<ExampleRunner example={example} number={index + 1} />, host, String(index)) : null
      })}
    </>
  )
}

import type { Plugin } from 'vite'

/**
 * For `vite build --mode offline`: puts the bundled script and styles inside
 * index.html, so the page works when opened straight from disk.
 *
 * Browsers refuse to load scripts, styles and workers from other files on a
 * file:// page, but run code that is inside the page itself. The rest of the
 * offline setup is in vite.config.ts: one script with no lazy chunks, the
 * worker embedded (createWorker.inline.ts), assets as data: URLs and #/ routes.
 */
export function inlineIntoHtml(): Plugin {
  return {
    name: 'sql-learner:inline-into-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((file) => file.type === 'asset' && file.fileName === 'index.html')
      if (!html || html.type !== 'asset') return
      let source = String(html.source)

      for (const [fileName, file] of Object.entries(bundle)) {
        // Tags look like <script type="module" crossorigin src="./assets/index-abc.js"></script>.
        const reference = new RegExp(`<(script|link)\\b[^>]*?(?:src|href)="\\./${escapeRegExp(fileName)}"[^>]*>(?:</script>)?`)
        if (!reference.test(source)) continue

        if (file.type === 'chunk') {
          // "</script" inside the code would end the tag early; "<\/script" means the same in JavaScript.
          const code = file.code
            // Vite fills this placeholder with the files to preload before a lazy
            // import, but only when there are separate chunks. Here there are none.
            .replaceAll('__VITE_PRELOAD__', 'void 0')
            .replace(/<\/script/gi, '<\\/script')
          source = source.replace(reference, () => `<script type="module">${code}</script>`)
        } else if (fileName.endsWith('.css')) {
          const css = String(file.source).replace(/<\/style/gi, '<\\/style')
          source = source.replace(reference, () => `<style>${css}</style>`)
        } else continue

        delete bundle[fileName]
      }
      html.source = source

      // Loaded by app/index.html when it is opened from disk, to check that this build exists.
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.js',
        source: `window.sqlLearnerOfflineBuild = ${JSON.stringify({ builtAt: new Date().toISOString() })}\n`,
      })
    },
  }
}

/**
 * Removes the file:// preview block from index.html in every build. It is only
 * meant for app/index.html itself opened from disk, which forwards to
 * dist-offline/index.html; inside a build it would point at a folder that is not there.
 */
export function stripFilePreview(): Plugin {
  return {
    name: 'sql-learner:strip-file-preview',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/[ \t]*<!-- file-preview:start -->[\s\S]*?<!-- file-preview:end -->\r?\n?/, ''),
    },
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

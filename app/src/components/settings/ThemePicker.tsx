import { THEMES, type ThemeId } from '../../features/theme/theme.ts'
import styles from './ThemePicker.module.css'

interface ThemePickerProps {
  value: ThemeId
  onChange: (theme: ThemeId) => void
}

/**
 * One radio button per theme, each with a small preview of the app drawn in
 * that theme's own colours (the preview sets data-theme, so it uses the real tokens).
 */
export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <fieldset className={styles.picker}>
      <legend className="visually-hidden">Theme</legend>
      <div className={styles.grid}>
        {THEMES.map((theme) => {
          const selected = theme.id === value
          return (
            <label key={theme.id} className={styles.option} data-selected={selected || undefined}>
              <span className={styles.preview} data-theme={theme.id} aria-hidden="true">
                <span className={styles.previewSidebar}>
                  <span className={styles.previewNav} />
                  <span className={styles.previewNavActive} />
                  <span className={styles.previewNav} />
                </span>
                <span className={styles.previewMain}>
                  <span className={styles.previewCard}>
                    <span className={styles.previewTitle} />
                    <span className={styles.previewText} />
                    <span className={styles.previewButton} />
                  </span>
                </span>
              </span>
              <span className={styles.choice}>
                <input
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={selected}
                  onChange={() => onChange(theme.id)}
                  className={styles.radio}
                />
                <span className={styles.name}>{theme.label}</span>
                {selected && (
                  <span className={styles.badge} aria-hidden="true">
                    Selected
                  </span>
                )}
              </span>
              <span className={styles.description}>{theme.description}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// Generated at build time by plugins/content. The shapes are in ./types.ts;
// src/content/index.ts and src/content/challenges.ts apply those types.
declare module 'virtual:sql-learner-content' {
  export const modules: unknown
  export const challenges: unknown
  export const quizzes: unknown
}

// Solutions are imported only by the database worker, one group at a time (see plugins/content/solutionGroups.ts).
declare module 'virtual:sql-learner-solution-index' {
  /** For each challenge, exercise and daily problem id: loads the group that holds its solution. */
  export const solutionLoaders: Record<string, () => Promise<{ solutions: unknown }>>
}

// The SQL Path content index, loaded only by the SQL Path pages (see plugins/content/pathContent.ts).
declare module 'virtual:sql-learner-path-content' {
  /** Per path: each written chapter's exercise ids and quiz size, and its daily-problem ids. */
  export const pathIndex: unknown
  /** Per path: loads its chapters, exercises, quizzes and project summaries. */
  export const pathContentLoaders: Record<string, () => Promise<unknown>>
  /** Per path with daily problems: loads their summaries. */
  export const pathProblemLoaders: Record<string, () => Promise<unknown>>
}

// Daily-problem text, one group of 30 days at a time (see plugins/content/problemText.ts).
declare module 'virtual:sql-learner-problem-text-index' {
  /** For each daily problem id: loads the group that holds its task, starter query, hints and objectives. */
  export const problemTextLoaders: Record<string, () => Promise<{ problemText: unknown }>>
}

// One SQL Path project's brief and task text per module (see plugins/content/projectText.ts).
declare module 'virtual:sql-learner-project-index' {
  /** For each "<path>/<project>": loads the project's brief and task text. */
  export const projectLoaders: Record<string, () => Promise<{ projectText: unknown }>>
}

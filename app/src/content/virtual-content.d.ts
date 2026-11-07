// Generated at build time by plugins/content. The shapes are in ./types.ts;
// src/content/index.ts and src/content/challenges.ts apply those types.
declare module 'virtual:sql-learner-content' {
  export const modules: unknown
  export const challenges: unknown
  export const quizzes: unknown
}

// Challenge solutions, kept out of the main bundle (see plugins/content/index.ts).
declare module 'virtual:sql-learner-challenge-solutions' {
  export const solutions: unknown
}

// SQL Path chapters, exercises (without solutions) and quizzes, loaded only by the SQL Path pages.
declare module 'virtual:sql-learner-path-content' {
  export const pathModules: unknown
  export const pathExercises: unknown
  export const pathQuizzes: unknown
}

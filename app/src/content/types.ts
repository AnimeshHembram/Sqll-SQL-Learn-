/**
 * Shape of the lesson content produced at build time by `plugins/content`.
 * Shared by the build plugin (which creates it) and the app (which reads it).
 */

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type Level = (typeof LEVELS)[number]

/** A runnable code block in a lesson. Its index matches the `data-example` attribute in the HTML. */
export interface LessonExample {
  /** `example` should run; `error` is a mistake that should fail. */
  kind: 'example' | 'error'
  sql: string
  /** The result table shown in the lesson, if any. */
  expected: { columns: string[]; rows: string[][] } | null
}

export interface ContentLesson {
  id: string
  title: string
  /** Position within its module, starting at 1. */
  order: number
  level: Level
  summary: string
  durationMinutes: number
  objectives: string[]
  /** Lesson body, converted from Markdown to HTML at build time. */
  html: string
  /** Runnable examples, in the order they appear. */
  examples: LessonExample[]
}

export interface ContentModule {
  id: string
  title: string
  /** Position in the curriculum, starting at 1. */
  order: number
  level: Level
  summary: string
  /** Module introduction, converted from Markdown to HTML at build time. */
  introHtml: string
  /** Sorted by `order`. */
  lessons: ContentLesson[]
}

/** How a challenge answer is compared with the reference answer. */
export interface EvaluationConfig {
  /** True when the task asks for a specific row order (ORDER BY). Otherwise rows may come in any order. */
  orderMatters: boolean
  /** True when the task names the result columns, so the learner's column names must match (ignoring case). */
  checkColumnNames: boolean
}

/** A table written in content, such as a challenge's expected result. */
export interface ContentTable {
  columns: string[]
  rows: string[][]
}

/**
 * The public part of a challenge, bundled with the app. It never contains the
 * solution, the expected result or the explanation (see ChallengeSolution).
 */
export interface ContentChallenge {
  id: string
  title: string
  /** Position in the challenge list, starting at 1. */
  order: number
  difficulty: Level
  /** Main SQL topic, used by the topic filter. For example "GROUP BY". */
  topic: string
  summary: string
  /** The learning module that teaches what this challenge needs, if there is one. */
  moduleId: string | null
  durationMinutes: number
  /** Sample database the challenge runs against (src/content/datasets/<dataset>.sql). */
  dataset: string
  /** Tables the challenge uses, shown beside the editor. */
  tables: string[]
  objectives: string[]
  /** What the learner should know first, in plain words. */
  prerequisites: string[]
  /** The task, converted from Markdown to HTML at build time. */
  descriptionHtml: string
  /** What the editor starts with. */
  starterSql: string
  /** Progressive hints as HTML, from a gentle nudge to almost the answer. */
  hints: string[]
  evaluation: EvaluationConfig
}

/**
 * The hidden part of a challenge. It is built into a separate module that only
 * the database worker imports, plus a chunk the page loads when the learner
 * chooses to see the solution.
 */
export interface ChallengeSolution {
  /** The trusted reference query. */
  sql: string
  /** The reference query's result, as written in the challenge file (checked by npm run check). */
  expected: ContentTable
  explanationHtml: string
  /** Other correct queries, shown with the solution. */
  alternatives: string[]
  evaluation: EvaluationConfig
  /** The dataset the queries run on, when it is not the bookstore (SQL Path projects have their own). */
  dataset?: string
}

export const QUESTION_TYPES = ['multiple-choice', 'predict-output', 'find-the-error', 'choose-the-clause', 'conceptual'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export interface QuizOption {
  /** Option text as inline HTML. */
  html: string
}

export interface QuizQuestion {
  /** Stable within its quiz, for example "q1". */
  id: string
  type: QuestionType
  topic: string
  difficulty: Level
  /** The question itself, as inline HTML. */
  questionHtml: string
  /** Supporting content such as a query to read, as HTML. May be empty. */
  promptHtml: string
  options: QuizOption[]
  /** Index into options. */
  correctIndex: number
  explanationHtml: string
}

export interface ContentQuiz {
  id: string
  title: string
  order: number
  difficulty: Level
  topic: string
  summary: string
  durationMinutes: number
  questions: QuizQuestion[]
}

// --- SQL Path chapters ----------------------------------------------------------------

/** Guided exercises come with a starting query and step-by-step instructions; independent ones do not. */
export type ExerciseKind = 'guided' | 'independent'

/** An exercise inside a SQL Path chapter. Checked exactly like a challenge; its solution is in the solutions module. */
export interface PathExercise extends ContentChallenge {
  pathId: string
  chapterId: string
  kind: ExerciseKind
}

/** One of a path's daily problems (Day 1 to 365). Checked exactly like a challenge. */
export interface PathProblem extends ContentChallenge {
  pathId: string
  /** 1 to 365. */
  day: number
  /** The shape of the expected result, shown before any attempt: column names and number of rows, never values. */
  expected: ExpectedShape
}

/** The text only a problem's own page needs. Loaded with its 30-day group (plugins/content/problemText.ts). */
export type ProblemText = Pick<PathProblem, 'descriptionHtml' | 'starterSql' | 'hints' | 'objectives' | 'prerequisites'>

/** What every SQL Path page knows about a daily problem: enough for lists, filters, progress and navigation. */
export type PathProblemSummary = Omit<PathProblem, keyof ProblemText>

export interface ExpectedShape {
  columns: string[]
  rowCount: number
}

/** One step of a SQL Path project's analysis. */
export interface ProjectMilestone {
  id: string
  title: string
  /** One sentence: what the learner finds out in this milestone. */
  goal: string
}

/** One task of a SQL Path project, checked like a daily problem against the project's own dataset. */
export interface ProjectTask extends ContentChallenge {
  pathId: string
  projectId: string
  milestoneId: string
  /** 1, 2, 3… in the order the tasks are worked through. */
  step: number
  expected: ExpectedShape
}

/** What every SQL Path page knows about a project task. Its text loads with the project (plugins/content/projectText.ts). */
export type ProjectTaskSummary = Omit<ProjectTask, keyof ProblemText>

/** What every SQL Path page knows about a written project: enough for the path page, progress and navigation. */
export interface PathProjectSummary {
  id: string
  pathId: string
  title: string
  order: number
  summary: string
  company: string
  industry: string
  /** The dataset file the project's tasks run on (src/content/datasets/<dataset>.sql). */
  dataset: string
  durationMinutes: number
  milestones: ProjectMilestone[]
  /** The capstone task, always the last step. */
  finalTaskId: string
  tasks: ProjectTaskSummary[]
}

/** The project brief and task text, loaded when one of the project's pages opens. */
export interface ProjectText {
  /** The brief's sections in file order, keyed by their "##" heading. */
  sections: { title: string; html: string }[]
  tasks: Record<string, ProblemText>
}

/** A chapter's end-of-chapter quiz. Its id is the chapter id. */
export interface PathQuiz extends ContentQuiz {
  pathId: string
}

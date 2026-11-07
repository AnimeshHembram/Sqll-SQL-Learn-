/**
 * SQL Path: the eight career paths, their roadmaps and chapter outlines.
 *
 * A chapter is either
 *   - available: it lists the existing Learn SQL lessons that teach it, and its
 *     progress comes from those lessons, or
 *   - planned: it has no lessons yet. It is shown and labelled as planned, and it
 *     never counts towards completion.
 *
 * Chapter content of its own (explanations, syntax, examples, exercises and a
 * chapter quiz), the 365 daily problems and the three projects of each path
 * arrive in later stages. scripts/test-paths.ts checks this file: eight paths,
 * unique ids, and that every linked lesson exists.
 */

export interface LessonRef {
  moduleId: string
  lessonId: string
}

export interface PathChapter {
  /** Unique within its path. */
  id: string
  title: string
  summary: string
  /** Existing lessons that teach this chapter. Empty means the chapter is planned. */
  lessons: readonly LessonRef[]
}

export interface PathStage {
  /** Unique within its path. */
  id: string
  title: string
  summary: string
  chapters: readonly PathChapter[]
}

export interface PathProject {
  id: string
  title: string
  summary: string
}

export interface CareerPath {
  id: string
  title: string
  /** One line for the path card. */
  tagline: string
  /** Who the path is for and what the job involves. */
  audience: string
  /** What the learner can do at the end. */
  outcomes: readonly string[]
  stages: readonly PathStage[]
  projects: readonly PathProject[]
}

/** Daily problems planned for every path. */
export const PROBLEMS_PER_PATH = 365

const fundamentals = (...lessonIds: string[]): LessonRef[] =>
  lessonIds.map((lessonId) => ({ moduleId: 'sql-fundamentals', lessonId }))
const summarising = (...lessonIds: string[]): LessonRef[] =>
  lessonIds.map((lessonId) => ({ moduleId: 'summarising-data', lessonId }))

const planned = (id: string, title: string, summary: string): PathChapter => ({ id, title, summary, lessons: [] })

/** The first stage of every path: the SQL every role needs, taught by the existing Learn SQL lessons. */
function foundations(context: string): PathStage {
  return {
    id: 'foundations',
    title: 'SQL foundations',
    summary: `The queries every ${context} writes daily: choosing columns, filtering, sorting and summarising rows.`,
    chapters: [
      {
        id: 'querying-a-table',
        title: 'Querying a table',
        summary: 'What SQL is, SELECT, filtering with WHERE, sorting with ORDER BY and limiting results.',
        lessons: fundamentals('what-is-sql', 'introduction-to-select', 'filtering-with-where', 'sorting-with-order-by', 'limiting-results'),
      },
      {
        id: 'summarising-data',
        title: 'Summarising data',
        summary: 'Counting rows, totals and averages, grouping with GROUP BY and filtering groups with HAVING.',
        lessons: summarising('counting-rows', 'sum-avg-min-max', 'grouping-with-group-by', 'filtering-groups-with-having'),
      },
      planned('combining-tables', 'Combining tables with joins', 'Inner and outer joins, join keys, and checking that a join has not duplicated rows.'),
    ],
  }
}

export const CAREER_PATHS: readonly CareerPath[] = [
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    tagline: 'Turn business questions into clear answers from data.',
    audience:
      'For people who want to answer questions such as "which products are growing?" or "where do customers drop off?" by querying company data and explaining the results.',
    outcomes: [
      'Write accurate queries for sales, customer and product questions',
      'Build reusable metrics such as revenue, retention and conversion',
      'Check results for duplicates, missing data and other common traps',
    ],
    stages: [
      foundations('analyst'),
      {
        id: 'analysis-techniques',
        title: 'Analysis techniques',
        summary: 'The building blocks of most analysis queries.',
        chapters: [
          planned('conditional-logic', 'Conditional logic with CASE', 'Bucketing values, building flags and pivoting categories into columns.'),
          planned('dates-and-time', 'Working with dates', 'Truncating to day, week and month, date differences and period-over-period comparisons.'),
          planned('subqueries-and-ctes', 'Subqueries and CTEs', 'Breaking a long analysis into named, readable steps.'),
          planned('null-handling', 'Missing values', 'How NULL behaves in filters, joins and aggregates, and COALESCE.'),
        ],
      },
      {
        id: 'metrics',
        title: 'Business metrics',
        summary: 'The metrics analysts are asked for most often.',
        chapters: [
          planned('revenue-metrics', 'Revenue and order metrics', 'Revenue, average order value and growth over time.'),
          planned('funnels', 'Funnels and conversion', 'Counting each step of a funnel and where people drop off.'),
          planned('cohorts-retention', 'Cohorts and retention', 'Grouping customers by start month and tracking who returns.'),
        ],
      },
      {
        id: 'advanced-analysis',
        title: 'Advanced analysis',
        summary: 'Rankings, running totals and comparisons across rows.',
        chapters: [
          planned('window-functions', 'Window functions', 'ROW_NUMBER, RANK and partitions for per-group results.'),
          planned('running-totals', 'Running totals and moving averages', 'Cumulative sums and smoothing noisy daily numbers.'),
          planned('top-n-per-group', 'Top N per group', 'The best sellers in each category, the latest order per customer.'),
        ],
      },
      {
        id: 'reliable-results',
        title: 'Reliable results',
        summary: 'Making sure the answer you hand over is right.',
        chapters: [
          planned('data-quality-checks', 'Data quality checks', 'Finding duplicates, gaps and impossible values before they reach a report.'),
          planned('query-review', 'Reviewing an analysis query', 'Reading a query critically and explaining what it does.'),
        ],
      },
    ],
    projects: [
      { id: 'sales-performance-review', title: 'Sales performance review', summary: 'Analyse a year of orders to explain which products and regions drove growth.' },
      { id: 'customer-retention-study', title: 'Customer retention study', summary: 'Build monthly cohorts and find what returning customers have in common.' },
      { id: 'marketing-funnel-analysis', title: 'Marketing funnel analysis', summary: 'Measure each step from visit to purchase and identify the biggest drop-off.' },
    ],
  },
  {
    id: 'data-engineer',
    title: 'Data Engineer',
    tagline: 'Build the pipelines and tables that everyone else queries.',
    audience:
      'For people who want to move, clean and model data at scale so that analysts and applications can rely on it.',
    outcomes: [
      'Design tables and schemas for analytics',
      'Write repeatable transformations that load and update data',
      'Test data and keep pipelines correct when sources change',
    ],
    stages: [
      foundations('data engineer'),
      {
        id: 'defining-data',
        title: 'Defining data',
        summary: 'Creating and changing the structures data lives in.',
        chapters: [
          planned('creating-tables', 'Creating tables', 'CREATE TABLE, data types, defaults and constraints.'),
          planned('changing-data', 'Inserting, updating and deleting', 'INSERT, UPDATE and DELETE, and doing them safely.'),
          planned('keys-and-constraints', 'Keys and constraints', 'Primary keys, foreign keys, UNIQUE and CHECK.'),
        ],
      },
      {
        id: 'transformations',
        title: 'Transformations',
        summary: 'Turning raw data into clean, usable tables.',
        chapters: [
          planned('cleaning-data', 'Cleaning raw data', 'Trimming, casting, standardising values and removing duplicates.'),
          planned('incremental-loads', 'Incremental loads', 'Loading only new and changed rows, and upserts.'),
          planned('ctes-for-pipelines', 'CTEs for transformation steps', 'Readable multi-step transformations.'),
        ],
      },
      {
        id: 'modelling',
        title: 'Data modelling',
        summary: 'Shaping data for the people who query it.',
        chapters: [
          planned('normalisation', 'Normalisation', 'Removing repetition and keeping one fact in one place.'),
          planned('dimensional-models', 'Facts and dimensions', 'Star schemas for analytics.'),
          planned('slowly-changing-dimensions', 'Tracking history', 'Keeping old values when a customer or product changes.'),
        ],
      },
      {
        id: 'reliability',
        title: 'Reliability and performance',
        summary: 'Keeping pipelines correct and fast.',
        chapters: [
          planned('data-tests', 'Testing data', 'Row counts, uniqueness and referential checks as queries.'),
          planned('indexes-and-plans', 'Indexes and query plans', 'Reading EXPLAIN and making slow queries faster.'),
          planned('transactions', 'Transactions', 'All-or-nothing changes with BEGIN, COMMIT and ROLLBACK.'),
        ],
      },
    ],
    projects: [
      { id: 'orders-warehouse', title: 'Orders warehouse', summary: 'Model raw order exports into a fact table with customer and product dimensions.' },
      { id: 'incremental-pipeline', title: 'Incremental pipeline', summary: 'Load daily changes into a table without duplicates or lost updates.' },
      { id: 'data-quality-suite', title: 'Data quality suite', summary: 'Write the checks that catch a broken load before anyone uses the data.' },
    ],
  },
  {
    id: 'bi-analyst',
    title: 'BI Analyst',
    tagline: 'Design the reports and dashboards a business runs on.',
    audience:
      'For people who want to define the numbers a team watches every week and build the queries behind reports and dashboards.',
    outcomes: [
      'Define metrics so everyone counts them the same way',
      'Write report queries that stay correct as data grows',
      'Prepare tidy datasets for dashboard tools',
    ],
    stages: [
      foundations('BI analyst'),
      {
        id: 'report-queries',
        title: 'Report queries',
        summary: 'The query shapes behind most reports.',
        chapters: [
          planned('conditional-aggregation', 'Conditional aggregation', 'Several metrics in one query with CASE inside SUM and COUNT.'),
          planned('time-series-reports', 'Time series', 'Daily, weekly and monthly totals, including days with no data.'),
          planned('period-comparisons', 'Period comparisons', 'This month against last month, this year against last year.'),
        ],
      },
      {
        id: 'metric-definitions',
        title: 'Metric definitions',
        summary: 'One definition for every number.',
        chapters: [
          planned('kpi-design', 'Designing KPIs', 'Turning a business goal into a precise, countable definition.'),
          planned('views-for-reporting', 'Views for reporting', 'Saving shared definitions as views.'),
          planned('ratios-and-rates', 'Ratios and rates', 'Averages of averages and other ways ratios go wrong.'),
        ],
      },
      {
        id: 'dashboard-data',
        title: 'Dashboard data',
        summary: 'Datasets shaped for dashboards.',
        chapters: [
          planned('window-functions-bi', 'Window functions for reports', 'Running totals, shares of total and rankings.'),
          planned('pivoting', 'Pivoting and unpivoting', 'Rows into columns and back again.'),
          planned('reconciliation', 'Reconciling numbers', 'Finding why two reports disagree.'),
        ],
      },
    ],
    projects: [
      { id: 'executive-kpi-dashboard', title: 'Executive KPI dataset', summary: 'Define and calculate the weekly KPIs for a leadership dashboard.' },
      { id: 'regional-sales-report', title: 'Regional sales report', summary: 'Build a month-over-month report by region with targets.' },
      { id: 'metric-reconciliation', title: 'Metric reconciliation', summary: 'Explain and fix why two teams report different revenue.' },
    ],
  },
  {
    id: 'database-administrator',
    title: 'Database Administrator',
    tagline: 'Keep databases secure, fast and recoverable.',
    audience:
      'For people who want to run databases in production: managing access, protecting data, tuning performance and recovering from problems.',
    outcomes: [
      'Understand how tables, indexes and constraints are stored and used',
      'Manage users and permissions safely',
      'Diagnose slow queries and plan for recovery',
    ],
    stages: [
      foundations('database administrator'),
      {
        id: 'schema-management',
        title: 'Schema management',
        summary: 'Creating and safely changing database objects.',
        chapters: [
          planned('ddl-basics', 'Tables, types and constraints', 'CREATE, ALTER and DROP, and what each one locks.'),
          planned('schema-changes', 'Changing a live schema', 'Adding columns and constraints without breaking applications.'),
          planned('system-catalog', 'The system catalog', 'Querying the database about its own tables, columns and indexes.'),
        ],
      },
      {
        id: 'performance',
        title: 'Performance',
        summary: 'Finding and fixing slow queries.',
        chapters: [
          planned('indexes', 'Indexes', 'How indexes work, when they help and when they do not.'),
          planned('query-plans', 'Reading query plans', 'EXPLAIN and spotting full scans.'),
          planned('statistics-and-maintenance', 'Statistics and maintenance', 'ANALYZE, VACUUM and keeping the planner informed.'),
        ],
      },
      {
        id: 'security-and-recovery',
        title: 'Security and recovery',
        summary: 'Protecting data and getting it back.',
        chapters: [
          planned('users-and-permissions', 'Users and permissions', 'GRANT, REVOKE and the principle of least privilege.'),
          planned('transactions-and-locking', 'Transactions and locking', 'Isolation levels, deadlocks and blocking.'),
          planned('backup-and-restore', 'Backup and restore', 'Planning backups and testing that they restore.'),
        ],
      },
    ],
    projects: [
      { id: 'permission-audit', title: 'Permission audit', summary: 'Review who can read and change each table and tighten access.' },
      { id: 'slow-query-investigation', title: 'Slow query investigation', summary: 'Find the slowest queries in a workload and fix them with indexes.' },
      { id: 'safe-migration', title: 'Safe schema migration', summary: 'Plan and test a schema change that keeps the application running.' },
    ],
  },
  {
    id: 'database-developer',
    title: 'Database Developer',
    tagline: 'Design schemas and write the SQL that applications depend on.',
    audience:
      'For people who want to design databases and write views, functions and stored logic that are correct, consistent and maintainable.',
    outcomes: [
      'Design normalised schemas with the right keys and constraints',
      'Write complex queries, views and set-based updates',
      'Keep data consistent with transactions and constraints',
    ],
    stages: [
      foundations('database developer'),
      {
        id: 'schema-design',
        title: 'Schema design',
        summary: 'Structuring data so it stays correct.',
        chapters: [
          planned('entities-and-relationships', 'Entities and relationships', 'One-to-many and many-to-many, and how to store them.'),
          planned('normal-forms', 'Normal forms', 'First, second and third normal form with examples.'),
          planned('constraints-design', 'Constraints as rules', 'Letting the database enforce the business rules.'),
        ],
      },
      {
        id: 'advanced-queries',
        title: 'Advanced queries',
        summary: 'The harder queries applications need.',
        chapters: [
          planned('set-operations', 'Set operations', 'UNION, INTERSECT and EXCEPT.'),
          planned('recursive-ctes', 'Recursive CTEs', 'Hierarchies such as categories and reporting lines.'),
          planned('window-functions-dev', 'Window functions', 'Ranking, gaps and islands, and running state.'),
        ],
      },
      {
        id: 'database-logic',
        title: 'Logic in the database',
        summary: 'Reusable logic close to the data.',
        chapters: [
          planned('views', 'Views', 'Hiding complexity behind a stable interface.'),
          planned('triggers', 'Triggers', 'Automatic actions on insert, update and delete, and their risks.'),
          planned('transactions-dev', 'Transactions and concurrency', 'Keeping related changes together under concurrent use.'),
        ],
      },
    ],
    projects: [
      { id: 'library-schema', title: 'Library system schema', summary: 'Design a schema for loans, members and reservations with full constraints.' },
      { id: 'reporting-views', title: 'Reporting views', summary: 'Build a layer of views that hides a complex schema from report writers.' },
      { id: 'inventory-consistency', title: 'Inventory consistency', summary: 'Keep stock levels correct under concurrent orders.' },
    ],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    tagline: 'Use SQL well from application code.',
    audience:
      'For developers who build APIs and services and want to model data, write efficient queries and avoid common database mistakes in application code.',
    outcomes: [
      'Model application data in tables',
      'Write safe, parameterised queries for create, read, update and delete',
      'Avoid slow patterns such as N+1 queries and missing indexes',
    ],
    stages: [
      foundations('backend developer'),
      {
        id: 'application-data',
        title: 'Application data',
        summary: 'Storing and changing the data an app works with.',
        chapters: [
          planned('crud', 'Create, read, update, delete', 'The four operations every API performs.'),
          planned('modelling-app-data', 'Modelling application data', 'Users, accounts, orders and the keys that link them.'),
          planned('pagination', 'Pagination', 'LIMIT and OFFSET, and keyset pagination for large tables.'),
        ],
      },
      {
        id: 'safe-queries',
        title: 'Safe queries',
        summary: 'Queries that cannot be abused or corrupt data.',
        chapters: [
          planned('parameterised-queries', 'Parameterised queries', 'Why string-built SQL is dangerous and how parameters prevent injection.'),
          planned('transactions-backend', 'Transactions in requests', 'Keeping a request\'s changes all-or-nothing.'),
          planned('constraints-backend', 'Constraints as a safety net', 'Uniqueness and foreign keys that protect data from bugs.'),
        ],
      },
      {
        id: 'performance-backend',
        title: 'Performance',
        summary: 'Fast queries under real traffic.',
        chapters: [
          planned('indexes-backend', 'Indexes for queries', 'Choosing indexes from the queries an API runs.'),
          planned('n-plus-one', 'The N+1 problem', 'Replacing a query per row with one join.'),
          planned('explain-backend', 'Reading query plans', 'Using EXPLAIN to check a query before it ships.'),
        ],
      },
    ],
    projects: [
      { id: 'blog-api-schema', title: 'Blog API data layer', summary: 'Model posts, comments and tags, and write the queries for each endpoint.' },
      { id: 'checkout-transactions', title: 'Checkout transactions', summary: 'Make order placement safe when two customers buy the last item.' },
      { id: 'feed-performance', title: 'Activity feed performance', summary: 'Speed up a slow feed query with indexes and keyset pagination.' },
    ],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    tagline: 'Prepare and explore data for statistics and models.',
    audience:
      'For people who build models and run experiments and want to extract, explore and prepare their data with SQL instead of exporting everything first.',
    outcomes: [
      'Explore distributions and relationships in SQL',
      'Build feature tables for models',
      'Analyse experiments and avoid data leakage',
    ],
    stages: [
      foundations('data scientist'),
      {
        id: 'exploration',
        title: 'Exploring data',
        summary: 'Understanding a dataset before modelling it.',
        chapters: [
          planned('distributions', 'Distributions', 'Counts, percentiles, histograms and outliers.'),
          planned('missing-and-messy', 'Missing and messy data', 'Measuring and handling NULLs and bad values.'),
          planned('sampling', 'Sampling', 'Random and stratified samples in SQL.'),
        ],
      },
      {
        id: 'features',
        title: 'Feature engineering',
        summary: 'Turning raw events into model inputs.',
        chapters: [
          planned('aggregated-features', 'Aggregated features', 'Counts, sums and recency per customer.'),
          planned('window-features', 'Time-window features', 'Activity in the last 7 and 30 days with window functions.'),
          planned('leakage', 'Avoiding leakage', 'Building features only from data available at prediction time.'),
        ],
      },
      {
        id: 'experiments',
        title: 'Experiments',
        summary: 'Measuring the effect of a change.',
        chapters: [
          planned('ab-test-analysis', 'A/B test analysis', 'Comparing groups and their conversion rates.'),
          planned('statistics-in-sql', 'Statistics in SQL', 'Means, variance and confidence intervals with aggregates.'),
        ],
      },
    ],
    projects: [
      { id: 'churn-features', title: 'Churn feature table', summary: 'Build a leakage-free feature table for predicting customer churn.' },
      { id: 'ab-test-readout', title: 'A/B test readout', summary: 'Analyse an experiment and report the effect with its uncertainty.' },
      { id: 'exploratory-report', title: 'Exploratory data report', summary: 'Profile a new dataset: distributions, gaps and relationships.' },
    ],
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    tagline: 'Investigate logs and detect threats with SQL (defensive).',
    audience:
      'For defenders who search security logs, investigate incidents and write detections. This path is about finding and stopping attacks, not carrying them out.',
    outcomes: [
      'Search authentication, network and audit logs efficiently',
      'Write detection queries for suspicious patterns',
      'Build an incident timeline from several log sources',
    ],
    stages: [
      foundations('security analyst'),
      {
        id: 'log-investigation',
        title: 'Log investigation',
        summary: 'Finding what happened in large event logs.',
        chapters: [
          planned('log-tables', 'Working with log tables', 'Timestamps, event types and filtering by time range.'),
          planned('pattern-matching', 'Pattern matching', 'LIKE and string functions for usernames, paths and addresses.'),
          planned('failed-logins', 'Authentication events', 'Failed and successful logins per account and source.'),
        ],
      },
      {
        id: 'detection',
        title: 'Detection',
        summary: 'Queries that flag suspicious behaviour.',
        chapters: [
          planned('thresholds', 'Thresholds and baselines', 'Flagging activity well above an account\'s normal level.'),
          planned('sequences', 'Event sequences', 'Many failures followed by a success, with window functions.'),
          planned('rare-events', 'Rare events', 'First-seen countries, devices and processes.'),
        ],
      },
      {
        id: 'incident-response',
        title: 'Incident response',
        summary: 'Turning findings into a clear account of an incident.',
        chapters: [
          planned('timelines', 'Incident timelines', 'Combining sources into one ordered timeline.'),
          planned('scoping', 'Scoping an incident', 'Which accounts and hosts were affected.'),
          planned('access-review', 'Access reviews', 'Finding excessive or unused permissions in the database itself.'),
        ],
      },
    ],
    projects: [
      { id: 'brute-force-detection', title: 'Brute-force detection', summary: 'Detect password-guessing attempts in authentication logs and tune the threshold.' },
      { id: 'incident-timeline', title: 'Incident timeline', summary: 'Reconstruct a compromised account\'s activity across several log sources.' },
      { id: 'privileged-access-review', title: 'Privileged access review', summary: 'Find accounts with more access than their role needs.' },
    ],
  },
]

export function findPath(pathId: string): CareerPath | undefined {
  return CAREER_PATHS.find((path) => path.id === pathId)
}

export function pathUrl(pathId: string): string {
  return `/paths/${pathId}`
}

export function isChapterAvailable(chapter: PathChapter): boolean {
  return chapter.lessons.length > 0
}

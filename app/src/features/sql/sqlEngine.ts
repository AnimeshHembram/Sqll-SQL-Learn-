import type { EngineInfo, EvaluationResult, ExecuteResult, TableInfo, WorkerRequest, WorkerResponse } from './protocol.ts'

/**
 * Main-thread client for the database worker.
 *
 * - Starts the worker on first use, so pages that never run SQL never load it.
 * - Matches every response to its request by id, so a late answer can never be
 *   mistaken for the answer to a newer request.
 * - Stops runaway queries: sql.js cannot interrupt a running statement, so after
 *   QUERY_TIME_LIMIT_MS (or when the learner presses Stop) the worker is
 *   terminated and a new one is started. The session database is lost and the
 *   new worker starts from the original dataset; callers are told this happened.
 *
 * The app has two engines, each with its own worker: one for the practice space
 * and lesson examples, and one for challenges. A runaway challenge query can
 * therefore never reset the practice database.
 */

export const QUERY_TIME_LIMIT_MS = 5000

/** Time allowed for loading SQLite and the dataset. Slow devices may need a while. */
const START_TIME_LIMIT_MS = 30_000

export type EngineStatus = 'idle' | 'starting' | 'ready' | 'busy' | 'failed'

export interface EngineState {
  status: EngineStatus
  sqliteVersion: string | null
  /** Why the engine failed to start, when status is "failed". */
  failure: string | null
  /** Increases every time the session database is recreated (reset, stop, time-out or crash). */
  sessionVersion: number
}

/** Why a request did not complete. `restarted` means the session database was reset. */
export class EngineError extends Error {
  readonly reason: 'timeout' | 'stopped' | 'crashed' | 'failed'
  readonly restarted: boolean

  constructor(reason: EngineError['reason'], message: string, restarted: boolean) {
    super(message)
    this.name = 'EngineError'
    this.reason = reason
    this.restarted = restarted
  }
}

type RequestBody = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout> | undefined
}

interface EngineOptions {
  /** Worker name, shown in browser developer tools. */
  workerName: string
  /** What a restart means for the learner, appended to stop, time-out and crash messages. */
  restartNote: string
}

export class SqlEngine {
  private readonly options: EngineOptions
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()
  private busyCount = 0
  private listeners = new Set<() => void>()
  private state: EngineState = { status: 'idle', sqliteVersion: null, failure: null, sessionVersion: 0 }

  constructor(options: EngineOptions) {
    this.options = options
  }

  // --- State for React (useSyncExternalStore) ---------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): EngineState => this.state

  private setState(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  // --- Public API --------------------------------------------------------------

  /** Runs SQL against the session database, which keeps changes. */
  run(sql: string): Promise<ExecuteResult> {
    return this.call<ExecuteResult>({ type: 'execute', sql, scratch: false }, QUERY_TIME_LIMIT_MS)
  }

  /** Runs SQL against a fresh copy of the dataset. The session database is not touched. */
  runScratch(sql: string): Promise<ExecuteResult> {
    return this.call<ExecuteResult>({ type: 'execute', sql, scratch: true }, QUERY_TIME_LIMIT_MS)
  }

  /** Restores the session database to the original dataset. */
  async reset(): Promise<void> {
    await this.call({ type: 'reset' }, QUERY_TIME_LIMIT_MS)
    this.setState({ sessionVersion: this.state.sessionVersion + 1 })
  }

  schema(): Promise<TableInfo[]> {
    return this.call<TableInfo[]>({ type: 'schema' }, QUERY_TIME_LIMIT_MS)
  }

  /**
   * Checks a challenge answer. The worker runs the answer and the reference query
   * on separate fresh, read-only copies of the dataset. The time limit covers both.
   */
  evaluate(challengeId: string, sql: string): Promise<EvaluationResult> {
    return this.call<EvaluationResult>({ type: 'evaluate', challengeId, sql }, QUERY_TIME_LIMIT_MS)
  }

  /** Starts the engine early, for example when the Practice page opens. */
  start(): Promise<void> {
    return this.ensureReady()
  }

  /** Stops whatever is running by restarting the worker. The session database is reset. */
  stop(): void {
    if (this.busyCount === 0) return
    this.restart(
      new EngineError(
        'stopped',
        `The query was stopped. ${this.options.restartNote}`,
        true,
      ),
    )
  }

  /** Tries again after a failed start. */
  retry(): Promise<void> {
    this.terminate()
    this.setState({ status: 'idle', failure: null })
    return this.ensureReady()
  }

  // --- Internals ---------------------------------------------------------------

  private ensureReady(): Promise<void> {
    this.ready ??= this.boot()
    return this.ready
  }

  private async boot(): Promise<void> {
    this.setState({ status: 'starting', failure: null })
    try {
      const worker = new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module', name: this.options.workerName })
      worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => this.receive(event.data))
      worker.addEventListener('error', (event) => {
        event.preventDefault()
        this.handleCrash()
      })
      worker.addEventListener('messageerror', () => this.handleCrash())
      this.worker = worker

      const info = await this.send<EngineInfo>({ type: 'init' }, START_TIME_LIMIT_MS, false)
      this.setState({ status: 'ready', sqliteVersion: info.sqliteVersion })
    } catch (error) {
      this.terminate()
      const failure =
        'The SQL engine could not start. Check that your browser supports WebAssembly and Web Workers, then try again.'
      this.setState({ status: 'failed', failure })
      throw new EngineError('failed', `${failure} (${error instanceof Error ? error.message : String(error)})`, false)
    }
  }

  private async call<T>(body: RequestBody, timeoutMs: number): Promise<T> {
    await this.ensureReady()
    this.busyCount += 1
    this.setState({ status: 'busy' })
    try {
      return await this.send<T>(body, timeoutMs, true)
    } finally {
      this.busyCount = Math.max(0, this.busyCount - 1)
      if (this.busyCount === 0 && this.state.status === 'busy') this.setState({ status: 'ready' })
    }
  }

  /**
   * Posts a request. On time-out, a running query is stopped by restarting the
   * worker (`restartOnTimeout`); during start-up the request simply fails.
   */
  private send<T>(body: RequestBody, timeoutMs: number, restartOnTimeout: boolean): Promise<T> {
    const worker = this.worker
    if (!worker) return Promise.reject(new EngineError('crashed', 'The SQL engine is not running.', false))

    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!restartOnTimeout) {
          this.pending.delete(id)
          reject(new Error(`no response within ${timeoutMs / 1000} seconds`))
          return
        }
        this.restart(
          new EngineError(
            'timeout',
            `The query was stopped after ${QUERY_TIME_LIMIT_MS / 1000} seconds, so the app stays responsive. ` +
              this.options.restartNote,
            true,
          ),
        )
      }, timeoutMs)
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
      worker.postMessage({ ...body, id } as WorkerRequest)
    })
  }

  private receive(response: WorkerResponse) {
    const pending = this.pending.get(response.id)
    // An answer for a request that was already abandoned (stopped or timed out) is ignored.
    if (!pending) return
    this.pending.delete(response.id)
    clearTimeout(pending.timer)
    if (response.ok) pending.resolve(response.value)
    else pending.reject(new Error(response.error))
  }

  private handleCrash() {
    // A worker that fails while starting (for example, its script or the WebAssembly
    // file cannot load) is not restarted automatically: boot() reports the failure
    // and the learner can retry. Restarting here would loop forever.
    if (this.state.status === 'starting') {
      this.pending.forEach(({ reject, timer }) => {
        clearTimeout(timer)
        reject(new Error('the database worker failed to load'))
      })
      this.pending.clear()
      return
    }
    this.restart(
      new EngineError(
        'crashed',
        `The database engine stopped unexpectedly and was restarted. ${this.options.restartNote}`,
        true,
      ),
    )
  }

  /** Terminates the worker, fails every pending request with `reason`, and boots a new worker. */
  private restart(reason: EngineError) {
    this.terminate()
    this.pending.forEach(({ reject, timer }) => {
      clearTimeout(timer)
      reject(reason)
    })
    this.pending.clear()
    this.busyCount = 0
    this.setState({ status: 'idle', sessionVersion: this.state.sessionVersion + 1 })
    void this.ensureReady().catch(() => {
      // A failed start is reported through state ("failed"); nothing else to do here.
    })
  }

  private terminate() {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
  }
}

/** The practice and lesson engine. One for the whole app, so the practice database survives page changes. */
export const sqlEngine = new SqlEngine({
  workerName: 'sql-learner-database',
  restartNote: 'The database engine was restarted, so the database is back to the original bookstore data.',
})

/**
 * The challenge engine. Every challenge run and submission uses a fresh copy of
 * the dataset, so a restart loses nothing.
 */
export const challengeEngine = new SqlEngine({
  workerName: 'sql-learner-challenges',
  restartNote: 'Nothing was saved or changed, and your query is still in the editor.',
})

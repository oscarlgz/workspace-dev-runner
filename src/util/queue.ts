import { equals } from 'lodash/fp'
import EventEmitter from 'eventemitter3'

type RunnerReturnType = { cancel: () => void; promise: Promise<any> }

export class Queue<TaskArgs extends Record<string, any>> extends EventEmitter<
  'finished' | 'stopped'
> {
  private _queue: TaskArgs[] = []

  private _hasInitialized = false

  private _isRunning = false

  private _currentJob: null | {
    cancel: () => void
    task: TaskArgs
  } = null

  private _runner: (args: TaskArgs) => RunnerReturnType

  constructor(runner: (args: TaskArgs) => RunnerReturnType) {
    super()

    this._runner = runner
  }

  public push(task: TaskArgs) {
    if (this._isHomogenicQueue(task)) {
      return false
    }

    if (this._isRunning && this._currentJob && equals(this._currentJob.task, task)) {
      this._isRunning = false

      this._currentJob.cancel()

      this._queue.shift()
      this._queue.unshift(task)
    } else if (!this._queueHasJob(task)) {
      this._queue.push(task)
    }

    if (this._hasInitialized && !this._isRunning) {
      this.start()
    }
  }

  public start() {
    this._isRunning = true
    this._hasInitialized = true

    this._processNext()
  }

  public stop() {
    this._queue = []

    this._isRunning = false

    this._currentJob?.cancel()
    this._currentJob = null

    this.emit('stopped')
  }

  private _queueHasJob(task: TaskArgs) {
    return this._queue.find(equals(task))
  }

  private _isHomogenicQueue(task: TaskArgs) {
    return (
      (this._queue.length === 0 && equals(this._currentJob?.task, task)) ||
      (this._queue.length > 0 && this._queue.every(equals(task)))
    )
  }

  private _processNext() {
    const task = this._queue.shift()

    if (!task) {
      this._isRunning = false

      this.emit('finished')

      return
    }

    const { cancel, promise } = this._runner(task)

    this._currentJob = { cancel, task }

    promise
      .then(() => {
        if (this._isRunning) {
          this._currentJob = null

          this._processNext()
        }
      })
      .catch(() => {
        this.stop()
      })
  }
}

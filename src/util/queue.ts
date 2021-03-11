import EventEmitter from 'eventemitter3'

type RunnerReturnType = { cancel: () => void; promise: Promise<any> }

export class Queue<TaskArgs extends Record<string, any>> extends EventEmitter {
  private _queue: Array<{ args: TaskArgs; id?: string }> = []

  private _isRunning = false

  private _currentJob?: {
    cancel: () => void
    id?: string
  }

  private _runner: (args: TaskArgs) => RunnerReturnType

  constructor(runner: (args: TaskArgs) => RunnerReturnType) {
    super()

    this._runner = runner
  }

  public push(args: TaskArgs, id?: string) {
    this._queue.push({ args, id })
  }

  public start() {
    this._isRunning = true

    this._processNext()
  }

  public stop() {
    this._queue = []

    this._isRunning = false

    this._currentJob?.cancel()
  }

  private _processNext() {
    const task = this._queue.shift()

    if (!task) {
      return
    }

    const { cancel, promise } = this._runner(task.args)

    this._currentJob = { cancel, id: task.id }

    promise
      .then(() => {
        if (this._isRunning) {
          this._processNext()
        }
      })
      .catch(() => {
        this.stop()
      })
  }
}

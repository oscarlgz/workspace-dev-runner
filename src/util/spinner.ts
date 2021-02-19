import ora, { Ora } from 'ora'
import chalk from 'chalk'

export class Spinner {
  private spinner: Ora

  constructor() {
    this.spinner = ora()
  }

  start(title?: string, message = '') {
    if (title) {
      this.spinner.start(`${chalk.bold.cyan(title)} ${message}`)
    } else {
      this.spinner.start()
    }

    return this
  }

  update(title: string, message = '') {
    this.spinner.text = `${chalk.bold.cyan(title)} ${message}`

    return this
  }

  succeed(title: string, message = '') {
    this.spinner.succeed(`${chalk.bold.green(title)} ${message}`)

    return this
  }

  fail(title: string, message = '') {
    this.spinner.fail(`${chalk.bold.red(title)} ${message}`)

    return this
  }

  stop() {
    this.spinner.stop()

    return this
  }
}

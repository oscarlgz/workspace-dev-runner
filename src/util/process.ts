import chalk from 'chalk'
import { ChildProcess, SpawnOptions, spawn } from 'child_process'
import Bromise from 'bluebird'

export const clearConsole = () => {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H')
}

export const exitWithMessage = (msg: string) => {
  console.log()
  console.error(chalk.bold.red(`⚠️  ${msg}`))
  console.log()

  process.exit(1)

  throw new Error('Unreachable Error')
}

export const runAsync = (
  command: string,
  args?: readonly string[],
  options?: SpawnOptions
): Bromise<void | {
  code: number
  output: Array<{ stdout: string } | { stderr: string }>
}> =>
  new Bromise((resolve, reject, onCancel) => {
    let proc: ChildProcess

    if (args && options) {
      proc = spawn(command, args, options)
    } else if (args) {
      proc = spawn(command, args)
    } else {
      proc = spawn(command)
    }

    const output: Array<{ stdout: string } | { stderr: string }> = []

    proc.stdout?.on('data', (data) => {
      output.push({ stdout: data.toString() })
    })

    proc.stderr?.on('data', (data) => {
      output.push({ stderr: data.toString() })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject({ code, output })
      }
    })

    onCancel?.(() => {
      proc?.kill()
    })
  })

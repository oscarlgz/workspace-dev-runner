import { exec, spawn } from 'child_process'
import readline from 'readline'
import { connect } from '../util/pm2'
import { ProgramLogsOptions } from '../types'

export const runLogs = async (options: ProgramLogsOptions) => {
  readline.emitKeypressEvents(process.stdin)

  process.stdin.setRawMode(true)

  await connect()

  const proc = spawn('yarn', ['pm2', 'logs', options.packageName], {
    stdio: 'inherit',
  })

  process.stdin.on('keypress', (_, key) => {
    if (key.name === 'c' && key.ctrl) {
      proc.kill()

      process.exit(0)
    }

    if (key.name === 'r') {
      exec(`yarn pm2 reload ${options.packageName}`)
    }
  })
}

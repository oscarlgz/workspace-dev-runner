import { Command } from 'commander'
import { runDev } from './command/start'
import { runLog } from './command/log'

const program = new Command()

program.version('__VERSION__')

export const createProgram = () => {
  program
    .command('start')
    .description('Build your packages')
    .option('-f, --force', 'Force building dependencies even if exist', false)
    .option('-p, --package-names <package...>', 'Build for specified packages')
    .action(runDev)

  program
    .command('log')
    .description('Log runtime output')
    .option('-p, --package-names <package...>', 'Log specified packages')
    .action(runLog)

  return program
}

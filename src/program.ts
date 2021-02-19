import { Command } from 'commander'
import { runDev } from './command/dev'

const program = new Command()

program.version('__VERSION__')

export const createProgram = () => {
  program
    .command('start')
    .description('Build your packages')
    .option('-f, --force', 'Force building dependencies even if exist', false)
    .option('-p, --package-name <string>', 'Build for specified package')
    .action(runDev)

  return program
}

import chalk from 'chalk'

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

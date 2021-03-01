export const cleanup = (callback: (code: number) => void) => {
  // Prevent process from exiting instantly
  process.stdin.resume()

  // Catches process exit, ctrl+c event, "kill pid" and uncaught exceptions
  process.on('exit', callback)
  process.on('SIGINT', callback)
  process.on('SIGUSR1', callback)
  process.on('SIGUSR2', callback)
  process.on('uncaughtException', callback)
}

import Bromise from 'bluebird'
import { createProgram } from './program'

Bromise.config({
  cancellation: true,
})

const program = createProgram()

program.parseAsync(process.argv).catch(() => {
  // eslint-disable-next-line no-process-exit
  process.exit(1)
})

import Bromise from 'bluebird'
import { createProgram } from './program'

Bromise.config({
  cancellation: true,
})

const program = createProgram()

program.parseAsync(process.argv).catch(() => {
  process.exit(1)
})

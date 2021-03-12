import { createProgram } from './program'

const program = createProgram()

program.parseAsync(process.argv).catch(() => {
  process.exit(1)
})

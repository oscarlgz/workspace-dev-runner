import { Transform } from 'stream'

const transformChunk = (chunk: Buffer, indicator: 'E' | 'O') =>
  chunk
    .toString()
    .split('\n')
    .map((s: string) => `${indicator} ${s}`)
    .join('\n')

export const transformOutStream = new Transform({
  transform(chunk, _, callback) {
    this.push(transformChunk(chunk, 'O') + '\n')
    callback()
  },
})

export const transformErrStream = new Transform({
  transform(chunk, _, callback) {
    this.push(transformChunk(chunk, 'E') + '\n')
    callback()
  },
})

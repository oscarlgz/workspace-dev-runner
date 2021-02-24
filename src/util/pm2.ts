import pm2, { StartOptions } from 'pm2'

export const connect = (): Promise<void> =>
  new Promise((resolve) => {
    pm2.connect((err) => {
      if (err) {
        console.error(err)
        process.exit(2)
      }

      resolve()
    })
  })

export const start = (options: StartOptions): Promise<Error | undefined> =>
  new Promise((resolve, reject) => {
    pm2.start(options, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(undefined)
      }
    })
  })

export const stop = (process: string | number): Promise<Error | undefined> =>
  new Promise((resolve, reject) => {
    pm2.stop(process, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(undefined)
      }
    })
  })

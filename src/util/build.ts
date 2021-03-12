import chalk from 'chalk'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { PackageInfos } from '../types'
import { getPackageDir } from './package'
import { Spinner } from './spinner'
import { getPackageHash, shouldRebuildPackage } from './packageHash'
import { Queue } from './queue'
import { writePackageHash } from './pfile'

export type BuildArgs = {
  orderedDependencyList: string[]
  packageMap: PackageInfos
  options: {
    force?: boolean
  }
}

const buildPackage = ({
  index,
  orderedDependencyList,
  packageMap,
  options,
}: BuildArgs & { index: number }) => {
  let spinner: Spinner | undefined

  let proc: ChildProcessWithoutNullStreams | undefined

  const pkgName = orderedDependencyList[index]

  const packageInfo = packageMap[pkgName]

  const packageDirPath = getPackageDir(packageInfo)

  const progress = chalk.bold.green(`[${index + 1}/${orderedDependencyList.length}]`)

  const promise = new Promise((resolve, reject) => {
    shouldRebuildPackage(packageInfo, packageMap)
      .then((isRebuildNeeded) => {
        spinner = new Spinner().start()

        spinner.update(`${progress} Building package ${pkgName}`)

        if (isRebuildNeeded || options.force) {
          proc = spawn('yarn', ['build'], {
            cwd: packageDirPath,
          })

          const output: Array<{ stdout: string } | { stderr: string }> = []

          proc.stdout?.on('data', (data) => {
            output.push({ stdout: data.toString() })
          })

          proc.stderr?.on('data', (data) => {
            output.push({ stderr: data.toString() })
          })

          proc.on('close', (code) => {
            if (code === 0) {
              getPackageHash(packageInfo, packageMap)
                .then((hash) => {
                  writePackageHash(packageInfo, hash)

                  spinner!.succeed(`${progress} Built package ${pkgName}`)

                  resolve(undefined)
                })
                .catch(reject)
            } else {
              spinner!.fail(`${progress} Failed to build package ${pkgName}`)

              output.forEach((msg: any) => {
                if ('stderr' in msg) {
                  console.error(chalk.bold.red(`⚠️  ${msg.stderr}`))
                } else {
                  console.log(chalk.white(`${msg.stdout}`))
                }
              })

              reject(new Error(`Could not build package ${pkgName}`))
            }
          })
        } else {
          spinner.succeed(`${progress} ${pkgName} already compiled`)

          resolve(undefined)
        }
      })
      .catch(reject)
  })

  return {
    cancel: () => {
      spinner?.stop()

      proc?.kill()
    },
    promise,
  }
}

export const buildDependencies = (buildArgs: BuildArgs) => {
  const queue = new Queue(buildPackage)

  buildArgs.orderedDependencyList.forEach((_, index) => {
    queue.push({ ...buildArgs, index })
  })

  const promise = new Promise((resolve, reject) => {
    queue.on('finished', () => {
      resolve(undefined)
    })

    queue.on('stopped', () => {
      reject()
    })
  })

  queue.start()

  return {
    cancel: () => {
      queue.stop()
    },
    promise,
  }
}

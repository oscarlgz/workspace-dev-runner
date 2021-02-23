import fs from 'fs'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import Bromise from 'bluebird'
import { intersection } from 'lodash/fp'
import { PackageInfo, PackageInfos, ProgramStartOptions } from '../types'
import {
  createPackageLookupByPathFunc,
  getPackageDir,
  getPackageInfosFromPackagePath,
} from './package'
import { Spinner } from './spinner'
import { getPackageHash, shouldRebuild } from './packageHash'
import { getLogForPackage, writePackageHash } from './pfile'
import { clearConsole, runAsync } from './process'
import { transformErrStream, transformOutStream } from './stream'
import { filterOutRuntimePackages, getWsRoot, isRootLockfile } from './workspace'
import { getOrderedDependenciesForPackages, getOrderedDependentsForPackage } from './dependencies'

type BuildOptions = {
  initial?: boolean
  force?: boolean
}

export const buildDependencies = (
  orderedDependencyList: string[],
  packageMap: PackageInfos,
  options: BuildOptions
): Bromise<boolean> =>
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  new Bromise(async (resolve, reject, onCancel) => {
    let spinner: Spinner

    let proc: ReturnType<typeof runAsync> | undefined

    onCancel?.(() => {
      spinner.stop()
      proc?.cancel()
    })

    for (const [i, pgkName] of orderedDependencyList.entries()) {
      const progress = chalk.bold.green(`[${i + 1}/${orderedDependencyList.length}]`)

      spinner = new Spinner().start()

      spinner.update(`${progress} Building package ${pgkName}`)

      const packageInfo = packageMap[pgkName]

      const packageDirPath = getPackageDir(packageInfo)

      if (options?.force === true || (await shouldRebuild(packageInfo, packageMap))) {
        try {
          proc = runAsync('yarn', ['build'], {
            cwd: packageDirPath,
          })

          await proc
        } catch (e) {
          spinner.fail(`${progress} Failed to build package ${pgkName}`)

          e.output.forEach((msg: any) => {
            if ('stderr' in msg) {
              console.error(chalk.bold.red(`⚠️  ${msg.stderr}`))
            } else {
              console.log(chalk.white(`${msg.stdout}`))
            }
          })

          if (options?.initial === true) {
            process.exit(1)
          } else {
            return reject(false)
          }
        }

        const hash = await getPackageHash(packageInfo, packageMap)

        writePackageHash(packageInfo, hash)

        spinner.succeed(`${progress} Built package ${pgkName}`)
      } else {
        spinner.succeed(`${progress} ${pgkName} already compiled`)
      }
    }

    return resolve(true)
  })

export const spawnRuntime = (packageInfo: PackageInfo) => {
  const packageDir = getPackageDir(packageInfo)

  const logFileName = getLogForPackage(packageInfo)

  const logFile = fs.createWriteStream(logFileName, { flags: 'a' })

  const proc = spawn('yarn', ['start'], {
    cwd: packageDir,
  })

  proc.stdout.pipe(transformOutStream).pipe(logFile)
  proc.stderr.pipe(transformErrStream).pipe(logFile)

  console.log(
    chalk.green.bold(
      `▶ Running package ${chalk.white.bold(
        packageInfo.name
      )}, see logs by running ${chalk.white.bold(`ws-dev-runner logs ${packageInfo.name}`)}`
    )
  )

  return proc
}

export const watchAndRunRuntimePackage = (
  runtimePackageInfoList: PackageInfo[],
  options: ProgramStartOptions
) => {
  const wsRoot = getWsRoot()

  let dependencyBuilder: Bromise<boolean> | undefined | null

  const runtimeProcMap = runtimePackageInfoList.reduce<
    Record<string, ChildProcessWithoutNullStreams>
  >((acc, packageInfo) => {
    acc[packageInfo.name] = spawnRuntime(packageInfo)

    return acc
  }, {})

  chokidar
    .watch(wsRoot, {
      ignored: ['**/node_modules/**', '**/dist/**'],
      ignoreInitial: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    .on('all', async (_, path) => {
      const packagePath = getPackageDir(runtimePackageInfoList[0])

      const packageMap = getPackageInfosFromPackagePath(packagePath)

      const packageLookup = createPackageLookupByPathFunc(packageMap)

      const runtimePackageDependencyList = getOrderedDependenciesForPackages(
        runtimePackageInfoList,
        packageMap
      )

      const packageName = packageLookup(path)

      let buildArgs: [string[], PackageInfos, ProgramStartOptions]

      if (isRootLockfile(path)) {
        buildArgs = [runtimePackageDependencyList, packageMap, { ...options, force: true }]
      } else if (packageName && runtimePackageDependencyList.includes(packageName)) {
        const orderedDependencyList = [
          packageName,
          ...getOrderedDependentsForPackage(packageName, packageMap),
        ]

        buildArgs = [
          filterOutRuntimePackages(orderedDependencyList, packageMap),
          packageMap,
          options,
        ]
      } else {
        return
      }

      clearConsole()

      if (dependencyBuilder) {
        dependencyBuilder.cancel()
      }

      for (const key of Object.keys(runtimeProcMap)) {
        if (
          intersection(
            getOrderedDependenciesForPackages([packageMap[key]], packageMap),
            buildArgs[0]
          ).length
        ) {
          console.log(chalk.magenta.bold(`ℹ Reloading runtime: ${chalk.white.bold(key)}`))

          runtimeProcMap[key].kill()
        }
      }

      dependencyBuilder = buildDependencies(...buildArgs)

      const success = await dependencyBuilder

      dependencyBuilder = null

      if (success) {
        for (const key of Object.keys(runtimeProcMap)) {
          if (runtimeProcMap[key].killed) {
            runtimeProcMap[key] = spawnRuntime(packageMap[key])
          }
        }
      }
    })
}

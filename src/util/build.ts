import chalk from 'chalk'
import chokidar from 'chokidar'
import Bromise from 'bluebird'
import { intersection } from 'lodash/fp'
import { PackageInfo, PackageInfos, ProgramStartOptions } from '../types'
import {
  createPackageLookupByPathFunc,
  getPackageDir,
  getPackageInfosFromPackagePath,
} from './package'
import { Spinner } from './spinner'
import * as pm2 from './pm2'
import { getPackageHash, shouldRebuild } from './packageHash'
import { writePackageHash } from './pfile'
import { clearConsole, runAsync } from './process'
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

export const spawnRuntime = async (packageInfo: PackageInfo) => {
  const cwd = getPackageDir(packageInfo)

  await pm2.start({
    name: packageInfo.name,
    script: 'yarn start',
    cwd,
  })

  console.log(
    chalk.green.bold(
      `▶ Running package ${chalk.white.bold(
        packageInfo.name
      )}, see logs by running ${chalk.white.bold(`ws-dev-runner logs ${packageInfo.name}`)}`
    )
  )
}

export const watchAndRunRuntimePackage = async (
  runtimePackageInfoList: PackageInfo[],
  options: ProgramStartOptions
) => {
  const wsRoot = getWsRoot()

  let dependencyBuilder: Bromise<boolean> | undefined | null

  for (const packageInfo of runtimePackageInfoList) {
    await spawnRuntime(packageInfo)
  }

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

      const restartProcesses: PackageInfo[] = []

      clearConsole()

      if (dependencyBuilder) {
        dependencyBuilder.cancel()
      }

      for (const packageInfo of runtimePackageInfoList) {
        if (
          intersection(getOrderedDependenciesForPackages([packageInfo], packageMap), buildArgs[0])
            .length
        ) {
          console.log(
            chalk.magenta.bold(`ℹ Reloading runtime: ${chalk.white.bold(packageInfo.name)}`)
          )

          restartProcesses.push(packageInfo)

          await pm2.stop(packageInfo.name)
        }
      }

      dependencyBuilder = buildDependencies(...buildArgs)

      const success = await dependencyBuilder

      dependencyBuilder = null

      if (success) {
        for (const packageInfo of restartProcesses) {
          await spawnRuntime(packageInfo)
        }
      }
    })
}

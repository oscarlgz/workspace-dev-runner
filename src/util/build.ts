import fs from 'fs'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { spawn } from 'child_process'
import Bromise from 'bluebird'
import { PackageInfo, PackageInfos } from '../types'
import { createPackageLookupByPathFunc, getPackageDir } from './package'
import { Spinner } from './spinner'
import { shouldRebuild, writeLatestChangeToDisk } from './shouldRebuild'
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
  options?: BuildOptions
): Bromise<boolean> =>
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  new Bromise(async (resolve, reject, onCancel) => {
    let spinner: Spinner

    let proc: ReturnType<typeof runAsync> | undefined

    clearConsole()

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

        await writeLatestChangeToDisk(packageInfo, packageMap)

        spinner.succeed(`${progress} Built package ${pgkName}`)
      } else {
        spinner.succeed(`${progress} ${pgkName} already compiled`)
      }
    }

    return resolve(true)
  })

export const spawnRuntime = (packageInfo: PackageInfo) => {
  const packageDir = getPackageDir(packageInfo)

  const logFile = fs.createWriteStream('/Users/oscarlgz/Sites/test/logFile.log', { flags: 'a' })

  const proc = spawn('yarn', ['start'], {
    cwd: packageDir,
  })

  proc.stdout.pipe(logFile)
  proc.stderr.pipe(logFile)

  console.log(
    chalk.green.bold(
      `▶ Running package ${chalk.white.bold(
        packageInfo.name
      )}, see logs by running ${chalk.white.bold(`ws-dev-runner logs ${packageInfo.name}`)}`
    )
  )

  return proc
}

export const watchAndRunRuntimePackage = async (
  packageInfoList: PackageInfo[],
  packageMap: PackageInfos
) => {
  const wsRoot = getWsRoot()

  const packageLookup = createPackageLookupByPathFunc(packageMap)

  const runtimePackageDependencyList = getOrderedDependenciesForPackages(
    packageInfoList,
    packageMap
  )

  let dependencyBuilder: Bromise<boolean> | undefined | null

  let runtimeProc = spawnRuntime(packageInfoList)

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  chokidar
    .watch(wsRoot, {
      ignored: ['**/node_modules/**', '**/dist/**'],
      ignoreInitial: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    .on('all', async (_, path) => {
      const packageName = packageLookup(path)

      let buildArgs: [string[], PackageInfos, BuildOptions?]

      if (isRootLockfile(path)) {
        buildArgs = [runtimePackageDependencyList, packageMap, { force: true }]
      } else if (packageName && runtimePackageDependencyList.includes(packageName)) {
        const orderedDependencyList = [
          packageName,
          ...getOrderedDependentsForPackage(packageName, packageMap),
        ]

        buildArgs = [filterOutRuntimePackages(orderedDependencyList, packageMap), packageMap]
      } else {
        return
      }

      if (dependencyBuilder) {
        dependencyBuilder.cancel()
      }

      runtimeProc.kill()

      dependencyBuilder = buildDependencies(...buildArgs)

      const success = await dependencyBuilder

      dependencyBuilder = null

      if (success) {
        runtimeProc = spawnRuntime(packageInfo)
      }
    })
}

import chalk from 'chalk'
import chokidar from 'chokidar'
import { spawn } from 'child_process'
import { OptionValues } from 'commander'
import Bromise from 'bluebird'
import { createPackageLookupByPathFunc, getPackageDir } from './package'
import { Spinner } from './spinner'
import { PackageInfo, PackageInfos } from '../types'
import { shouldRebuild, writeLatestChangeToDisk } from './shouldRebuild'
import { clearConsole, runAsync } from './process'
import { filterOutRuntimePackages, getWsRoot, isRootLockfile } from './workspace'
import { getOrderedDependenciesForPackage, getOrderedDependentsForPackage } from './dependencies'

type BuildOptions = {
  initial?: boolean
  force?: boolean
}

export const buildDependencies = (
  orderedDependencyList: string[],
  packageMap: PackageInfos,
  options?: BuildOptions
): Bromise<boolean> =>
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

        writeLatestChangeToDisk(packageInfo, packageMap)

        spinner.succeed(`${progress} Built package ${pgkName}`)
      } else {
        spinner.succeed(`${progress} ${pgkName} already compiled`)
      }
    }

    return resolve(true)
  })

export const spawnRuntime = (packageDir: string, options: OptionValues) => {
  const proc = spawn('node', [options.script], {
    stdio: 'inherit',
    cwd: packageDir,
  })

  return proc
}

export const watchAndRunRuntimePackage = async (
  packageInfo: PackageInfo,
  packageMap: PackageInfos,
  options: OptionValues
) => {
  const packageDir = getPackageDir(packageInfo)

  const wsRoot = getWsRoot()

  const packageLookup = createPackageLookupByPathFunc(packageMap)

  const runtimePackageDependencyList = getOrderedDependenciesForPackage(packageInfo, packageMap)

  let dependencyBuilder: Bromise<boolean> | undefined | null

  let runtimeProc = spawnRuntime(packageDir, options)

  chokidar
    .watch(wsRoot, {
      ignored: ['**/node_modules/**', '**/dist/**'],
      ignoreInitial: true,
    })
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
        runtimeProc = spawnRuntime(packageDir, options)
      }
    })
}

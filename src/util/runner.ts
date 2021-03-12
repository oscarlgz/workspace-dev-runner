import chokidar from 'chokidar'
import chalk from 'chalk'
import { intersection } from 'lodash/fp'
import pm2 from 'pm2'
import { PackageInfo, ProgramStartOptions } from '../types'
import {
  createPackageLookupByPathFunc,
  getPackageDir,
  getPackageInfosFromPackagePath,
} from './package'
import { filterOutRuntimePackages, getWsRoot, isRootLockfile } from './workspace'
import { getOrderedDependenciesForPackages, getOrderedDependentsForPackage } from './dependencies'
import { deleteProcess } from './pm2'
import { spawnRuntime } from './runtime'
import { Queue } from './queue'
import { BuildArgs, buildDependencies } from './build'

export const watchFunction = ({
  runtimePackageInfoList,
  path,
  options,
}: {
  runtimePackageInfoList: PackageInfo[]
  path: string
  options: ProgramStartOptions
}) => {
  let buildCancellation: undefined | (() => void)

  const promise = new Promise((resolve, reject) => {
    const restartProcesses: PackageInfo[] = []

    const packagePath = getPackageDir(runtimePackageInfoList[0])

    const packageMap = getPackageInfosFromPackagePath(packagePath)

    const packageLookup = createPackageLookupByPathFunc(packageMap)

    const runtimePackageDependencyList = getOrderedDependenciesForPackages(
      runtimePackageInfoList,
      packageMap
    )

    const packageName = packageLookup(path)

    let buildArgs: BuildArgs

    if (isRootLockfile(path)) {
      buildArgs = {
        orderedDependencyList: runtimePackageDependencyList,
        packageMap,
        options: { ...options, force: true },
      }
    } else if (packageName && runtimePackageDependencyList.includes(packageName)) {
      const orderedDependencyList = [
        packageName,
        ...getOrderedDependentsForPackage(packageName, packageMap),
      ]

      buildArgs = {
        orderedDependencyList: filterOutRuntimePackages(orderedDependencyList, packageMap),
        packageMap,
        options,
      }
    } else {
      return reject()
    }

    for (const packageInfo of runtimePackageInfoList) {
      if (
        intersection(
          getOrderedDependenciesForPackages([packageInfo], packageMap),
          buildArgs.orderedDependencyList
        ).length
      ) {
        console.log(
          chalk.magenta.bold(`ℹ Reloading runtime: ${chalk.white.bold(packageInfo.name)}`)
        )

        restartProcesses.push(packageInfo)

        pm2.stop(packageInfo.name, () => null)
      }
    }

    const builder = buildDependencies(buildArgs)

    buildCancellation = builder.cancel

    builder.promise
      .then(() => {
        Promise.all(restartProcesses.map((packageInfo) => spawnRuntime(packageInfo)))
          .then(resolve)
          .catch(reject)
      })
      .catch(reject)
  })

  return {
    cancel: () => buildCancellation?.(),
    promise,
  }
}

export const watchAndRunRuntimePackage = (
  runtimePackageInfoList: PackageInfo[],
  options: ProgramStartOptions
) => {
  const queue = new Queue(watchFunction)

  queue.start()

  const wsRoot = getWsRoot()

  for (const packageInfo of runtimePackageInfoList) {
    spawnRuntime(packageInfo).catch(() => null)
  }

  const watcher = chokidar.watch(wsRoot, {
    ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    ignoreInitial: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watcher.on('all', (_, path) => {
    queue.push({
      runtimePackageInfoList,
      path,
      options,
    })
  })

  return (cb: () => void) => {
    watcher.close().finally(() => {
      queue.stop()

      Promise.all(runtimePackageInfoList.map(({ name }) => deleteProcess(name))).finally(cb)
    })
  }
}

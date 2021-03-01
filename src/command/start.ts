import { connect, deleteProcess } from '../util/pm2'
import {
  getPackageDir,
  getPackageInfosFromPackagePath,
  getRuntimePackageInfo,
} from '../util/package'
import { buildDependencies, watchAndRunRuntimePackage } from '../util/build'
import { getOrderedDependenciesForPackages } from '../util/dependencies'
import { cleanup } from '../util/cleanup'
import { ProgramStartOptions } from '../types'

export const runDev = async (options: ProgramStartOptions) => {
  await connect()

  const runtimePackageInfoList = await getRuntimePackageInfo(options)

  const packagePath = getPackageDir(runtimePackageInfoList[0])

  const packageMap = getPackageInfosFromPackagePath(packagePath)

  const orderedDependencyList = getOrderedDependenciesForPackages(
    runtimePackageInfoList,
    packageMap
  )

  await buildDependencies(orderedDependencyList, packageMap, {
    force: options.force,
    initial: true,
  })

  watchAndRunRuntimePackage(runtimePackageInfoList, options).catch((e) => {
    throw e
  })

  cleanup(() => {
    Promise.all(runtimePackageInfoList.map(({ name }) => deleteProcess(name))).finally(() => {
      process.exit()
    })
  })
}

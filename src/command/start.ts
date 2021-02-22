import { getPackageDir } from '../util/package'
import { buildDependencies, watchAndRunRuntimePackage } from '../util/build'
import { getOrderedDependenciesForPackages } from '../util/dependencies'
import { getPackageInfosFromPackagePath, getRuntimePackageInfo } from '../util/package'
import { ProgramStartOptions } from '../types'

export const runDev = async (options: ProgramStartOptions) => {
  const packageInfoList = await getRuntimePackageInfo(options)

  const packagePaths = packageInfoList.map((packageInfo) => getPackageDir(packageInfo))

  const packageMap = getPackageInfosFromPackagePath(packagePaths[0])

  const orderedDependencyList = getOrderedDependenciesForPackages(packageInfoList, packageMap)

  await buildDependencies(orderedDependencyList, packageMap, {
    force: options.force,
    initial: true,
  })

  // watchAndRunRuntimePackage(packageInfo, packageMap)
}

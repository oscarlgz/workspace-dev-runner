import { OptionValues } from 'commander'
import { getPackageDir } from '../util/package'
import { buildDependencies, watchAndRunRuntimePackage } from '../util/build'
import { getOrderedDependenciesForPackage } from '../util/dependencies'
import { getPackageInfosFromPackagePath, getRuntimePackageInfo } from '../util/package'

export const runDev = async (options: OptionValues) => {
  const packageInfo = await getRuntimePackageInfo(options)

  const packagePath = getPackageDir(packageInfo)

  const packageMap = getPackageInfosFromPackagePath(packagePath)

  const orderedDependencyList = getOrderedDependenciesForPackage(packageInfo, packageMap)

  await buildDependencies(orderedDependencyList, packageMap, {
    force: options.force,
    initial: true,
  })

  watchAndRunRuntimePackage(packageInfo, packageMap)
}

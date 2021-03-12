import { connect } from '../util/pm2'
import {
  getPackageDir,
  getPackageInfosFromPackagePath,
  getRuntimePackageInfo,
} from '../util/package'
import { buildDependencies } from '../util/build'
import { watchAndRunRuntimePackage } from '../util/runner'
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

  await buildDependencies({
    orderedDependencyList,
    packageMap,
    options: {
      force: options.force,
    },
  }).promise.catch(() => {
    process.exit(1)
  })

  const cancel = watchAndRunRuntimePackage(runtimePackageInfoList, options)

  cleanup(() => {
    cancel(() => {
      process.exit()
    })
  })
}

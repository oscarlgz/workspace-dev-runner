import { getDependentMap, getTransitiveConsumers, getTransitiveProviders } from 'workspace-tools'
import { DepGraph } from 'dependency-graph'
import { pick, uniq } from 'lodash/fp'
import { DependencyMap, PackageInfo, PackageInfos } from '../types'

export const getOrderedDependenciesForPackages = (
  packageInfoList: PackageInfo[],
  packageMap: PackageInfos
) => {
  const ownDependencyMap: Map<string, Set<string>> = new Map()

  const dependencyMap = getDependentMap(packageMap)

  const transitiveProviders = uniq(
    packageInfoList
      .map((packageInfo) => getTransitiveProviders([packageInfo.name], packageMap))
      .flat()
  )

  for (const [key, depencencyList] of dependencyMap.entries()) {
    if (transitiveProviders.includes(key)) {
      ownDependencyMap.set(key, depencencyList)
    }
  }

  return orderDependencies(ownDependencyMap)
}

export const getOrderedDependentsForPackage = (packageName: string, packageMap: PackageInfos) => {
  let dependencyList: string[]

  dependencyList = getTransitiveConsumers([packageName], packageMap)

  const dependencyMap = getDependentMap(pick(dependencyList, packageMap))

  return orderDependencies(dependencyMap)
}

export const orderDependencies = (dependencyMap: DependencyMap) => {
  const dependencyGraph = new DepGraph()

  for (const key of dependencyMap.keys()) {
    dependencyGraph.addNode(key)
  }

  for (const [key, depencencyList] of dependencyMap.entries()) {
    for (let dependencyName of depencencyList.values()) {
      if (dependencyGraph.hasNode(dependencyName)) {
        dependencyGraph.addDependency(key, dependencyName)
      }
    }
  }

  try {
    return dependencyGraph.overallOrder()
  } catch (e) {
    console.log(e)
    throw e
  }
}

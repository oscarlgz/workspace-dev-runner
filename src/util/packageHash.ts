import { hashElement } from 'folder-hash'
import { PackageInfo, PackageInfos } from 'workspace-tools'
import { getTsConfigHash, getTsVersion } from './typescript'
import { getOrderedDependenciesForPackages } from './dependencies'
import { getPackageDir } from './package'
import { getHashForPackage } from './pfile'

export const getPackageHash = async (packageInfo: PackageInfo, packageMap: PackageInfos) => {
  const packageDir = getPackageDir(packageInfo)

  const { hash } = await hashElement(packageDir, {
    folders: {
      exclude: ['**node_modules'],
    },
    files: {
      exclude: ['**/*.test.*'],
    },
  })

  // Check dependency hashes
  const dependencyHashes = getOrderedDependenciesForPackages([packageInfo], packageMap)
    .map((packageName) => getHashForPackage(packageMap[packageName]))
    .join('-')

  const tsConfigHash = getTsConfigHash(packageInfo)

  const tsVersion = getTsVersion()

  return [hash, tsConfigHash, tsVersion, dependencyHashes].join('-')
}

export const shouldRebuild = async (packageInfo: PackageInfo, packageMap: PackageInfos) => {
  const storedHash = getHashForPackage(packageInfo)

  const currentHash = await getPackageHash(packageInfo, packageMap)

  return storedHash !== currentHash
}

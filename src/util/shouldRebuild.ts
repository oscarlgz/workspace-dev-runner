import { join } from 'path'
import { hashElement } from 'folder-hash'
import { readFileSync, writeFileSync } from 'fs'
import { PackageInfo, PackageInfos } from 'workspace-tools'
import { getWsRoot } from './workspace'
import { getTsConfigHash, getTsVersion } from './typescript'
import { getOrderedDependenciesForPackage } from './dependencies'
import { getPackageDir } from './package'

type ChangeFile = {
  hashes: Record<string, string>
  logs: Record<string, string>
}

const getDirectoryHash = async (
  packageInfo: PackageInfo,
  packageMap: PackageInfos,
  changeMap: Record<string, string>
) => {
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
  const dependencyHashes = getOrderedDependenciesForPackage(packageInfo, packageMap)
    .map((packageName) => changeMap[packageName])
    .join('-')

  const tsConfigHash = getTsConfigHash(packageInfo)

  const tsVersion = getTsVersion()

  return [hash, tsConfigHash, tsVersion, dependencyHashes].join('-')
}

const getLatestChangeFileName = () => {
  const wsRoot = getWsRoot()

  return join(wsRoot, '.lc')
}

const readChangeFile = (): ChangeFile => {
  const fileName = getLatestChangeFileName()

  return JSON.parse(
    readFileSync(fileName, {
      encoding: 'utf-8',
    })
  )
}

export const writeLatestChangeToDisk = async (
  packageInfo: PackageInfo,
  packageMap: PackageInfos
) => {
  let changeMap: ChangeFile['hashes']

  const fileName = getLatestChangeFileName()

  try {
    const changeFile = readChangeFile()

    changeMap = changeFile.hashes
  } catch (e) {
    changeMap = {}
  }

  changeMap[packageInfo.name] = await getDirectoryHash(packageInfo, packageMap, changeMap)

  writeFileSync(fileName, JSON.stringify(changeMap, null, 2))
}

export const shouldRebuild = async (packageInfo: PackageInfo, packageMap: PackageInfos) => {
  let changeMap: Record<string, string>

  try {
    const changeFile = readChangeFile()

    changeMap = changeFile.hashes
  } catch (_) {
    return true
  }

  const storedHash = changeMap[packageInfo.name]

  const currentHash = await getDirectoryHash(packageInfo, packageMap, changeMap)

  return storedHash !== currentHash
}

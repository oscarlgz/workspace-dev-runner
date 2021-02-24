import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { assocPath } from 'lodash/fp'
import { PackageInfo } from '../types'
import { getWsRoot } from './workspace'

type PFile = {
  hashes?: Record<string, string>
  logs?: Record<string, string>
}

const getFileName = () => {
  const wsRoot = getWsRoot()

  return join(wsRoot, '.lc')
}

const readPFile = (): PFile => {
  const fileName = getFileName()

  return JSON.parse(
    readFileSync(fileName, {
      encoding: 'utf-8',
    })
  )
}

const writePFile = (data: PFile) => {
  const fileName = getFileName()

  writeFileSync(fileName, JSON.stringify(data, null, 2))
}

export const getHashForPackage = (packageInfo: PackageInfo) => {
  try {
    const pfile = readPFile()

    return pfile.hashes?.[packageInfo.name]
  } catch (_) {
    return undefined
  }
}

export const writePackageHash = (packageInfo: PackageInfo, hash: string) => {
  let data: PFile

  try {
    const pFile = readPFile()

    data = assocPath(['hashes', packageInfo.name], hash, pFile)
  } catch (e) {
    data = assocPath(['hashes', packageInfo.name], hash, {})
  }

  writePFile(data)
}

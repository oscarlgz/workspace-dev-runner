import { join } from 'path'
import { getWorkspaceRoot } from 'workspace-tools'
import { PackageInfos } from '../types'
import { exitWithMessage } from './process'

export const getWsRoot = () => {
  let wsRoot: string | undefined

  try {
    wsRoot = getWorkspaceRoot(process.cwd())
  } catch (_) {
    exitWithMessage('Could not locate workspace root')
  }

  if (!wsRoot) {
    exitWithMessage('Could not locate workspace root')
  }

  return wsRoot!
}

export const isRootLockfile = (path: string) => {
  const wsRoot = getWsRoot()

  const lockfiles = [
    'yarn.lock',
    'pnpm-workspace.yaml',
    'rush.json',
    'package-lock.json',
  ].map((file) => join(wsRoot, file))

  return lockfiles.includes(path)
}

export const filterOutRuntimePackages = (dependencyList: string[], packageMap: PackageInfos) =>
  dependencyList.filter((packageName) => packageMap[packageName].scripts?.start == null)

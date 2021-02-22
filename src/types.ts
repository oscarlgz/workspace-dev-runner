export { PackageInfo, PackageInfos } from 'workspace-tools'

export type DependencyMap = Map<string, Set<string>>

export type ProgramStartOptions = {
  force: boolean
  packageNames: string[]
}

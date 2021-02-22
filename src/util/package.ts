import inquirer from 'inquirer'
import { getPackageInfos } from 'workspace-tools'
import { PackageInfo, PackageInfos } from '../types'
import { ProgramStartOptions } from '../types'
import { exitWithMessage } from './process'
import { getWsRoot } from './workspace'

export const getPackageDir = (packageInfo: PackageInfo) =>
  packageInfo.packageJsonPath.replace(/\/package\.json$/, '')

export const createPackageLookupByPathFunc = (packageMap: PackageInfos) => {
  const packagePaths = Object.values(packageMap).map<[RegExp, string]>((packageInfo) => {
    const packageDir = getPackageDir(packageInfo)

    return [new RegExp(`^${packageDir}`, 'i'), packageInfo.name]
  }, {})

  return (path: string) => {
    const packageInfo = packagePaths.find(([re]) => re.test(path))

    return packageInfo?.[1]
  }
}

export const getPackageInfosFromPackagePath = (packagePath: string) => getPackageInfos(packagePath)

export const getRuntimePackageInfo = async (options: ProgramStartOptions) => {
  let packageNames: string[]

  const wsRoot = getWsRoot()

  const packageMap = getPackageInfos(wsRoot)

  const packageNameList = Object.keys(packageMap)

  if (options.packageNames) {
    options.packageNames.forEach((packageName) => {
      if (!packageNameList.includes(packageName)) {
        return exitWithMessage('Package name not in dependency list')
      }
    })

    packageNames = options.packageNames
  } else {
    packageNames = await inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'packageNames',
          message: 'Choose package: ',
          choices: packageNameList,
        },
      ])
      .then((answers) => answers.packageNames)
  }

  return packageNames.map((packageName) => packageMap[packageName])
}

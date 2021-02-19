import { OptionValues } from 'commander'
import inquirer from 'inquirer'
import { getPackageInfos } from 'workspace-tools'
import { exitWithMessage } from './process'
import { getWsRoot } from './workspace'
import { PackageInfo, PackageInfos } from '../types'

export const getPackageDir = (packageInfo: PackageInfo) =>
  packageInfo.packageJsonPath.replace(/\/package\.json$/, '')

export const createPackageLookupByPathFunc = (packageMap: PackageInfos) => {
  const packagePaths = Object.values(packageMap).map<[RegExp, string]>((packageInfo) => {
    const packageDir = getPackageDir(packageInfo)

    return [new RegExp(`^${packageDir}`, 'i'), packageInfo.name]
  }, {})

  return (path: string) => {
    const packageInfo = packagePaths.find(([re]) => re.test(path))

    return packageInfo && packageInfo[1]
  }
}

export const getPackageInfosFromPackagePath = (packagePath: string) => getPackageInfos(packagePath)

export const getRuntimePackageInfo = async (options: OptionValues) => {
  let packageName: string

  const wsRoot = getWsRoot()

  const packageMap = getPackageInfos(wsRoot)

  const packageNameList = Object.keys(packageMap)

  if (options.packageName) {
    if (!packageNameList.includes(options.packageName)) {
      return exitWithMessage('Package name not in dependency list')
    }

    packageName = options.packageName
  } else {
    packageName = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'packageName',
          message: 'Choose package: ',
          choices: packageNameList,
        },
      ])
      .then(({ packageName }) => packageName)
  }

  return packageMap[packageName]
}

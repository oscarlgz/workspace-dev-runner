import { join } from 'path'
import crypto from 'crypto'
import { PackageInfo } from 'workspace-tools'
import ts from 'typescript'
import { execSync } from 'child_process'
import { getPackageDir } from './package'

export const getTsConfigHash = (packageInfo: PackageInfo) => {
  const packageDir = getPackageDir(packageInfo)

  const tsConfigPath = join(packageDir, 'tsconfig.json')

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile)

  const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, packageDir)

  return crypto.createHash('sha1').update(JSON.stringify(parsedTsConfig)).digest('base64')
}

export const getTsVersion = () =>
  JSON.parse(
    execSync('yarn info typescript version --json', {
      encoding: 'utf-8',
    })
  ).data

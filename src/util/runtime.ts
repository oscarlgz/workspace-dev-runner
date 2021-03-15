import chalk from 'chalk'
import { PackageInfo } from '../types'
import { getPackageDir } from './package'
import * as pm2 from './pm2'

export const spawnRuntime = async (packageInfo: PackageInfo) => {
  const cwd = getPackageDir(packageInfo)

  await pm2.start({
    name: packageInfo.name,
    script: 'yarn start',
    cwd,
  })

  console.log(
    chalk.green.bold(
      `▶ Running package ${chalk.white.bold(
        packageInfo.name
      )}, see logs by running ${chalk.white.bold(`ws-dev-runner logs -p ${packageInfo.name}`)}`
    )
  )
}

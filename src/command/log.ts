import { max } from 'lodash/fp'
import { Tail } from 'tail'
import chalk from 'chalk'
import { getRuntimePackageInfo } from '../util/package'
import { getLogForPackage } from '../util/pfile'
import { ProgramStartOptions } from '../types'

export const runLog = async (options: ProgramStartOptions) => {
  const runtimePackageInfoList = await getRuntimePackageInfo(options)

  const logFiles = runtimePackageInfoList.reduce<Record<string, string>>((acc, packageInfo) => {
    acc[packageInfo.name] = getLogForPackage(packageInfo)

    return acc
  }, {})

  const maxPackageNameLength = max(
    runtimePackageInfoList.map((packageInfo) => packageInfo.name.length)
  )

  Object.entries(logFiles).forEach(([packageName, logFile]) => {
    const tail = new Tail(logFile, {
      fromBeginning: true,
    })

    const paddedPackageName = packageName.padEnd(maxPackageNameLength!)

    tail.on('line', function (data) {
      const msg = data.slice(2)

      if (msg.trim() === '') {
        return
      }

      if (data[0] === 'E') {
        console.error(`${chalk.red.bold(`${paddedPackageName}:`)} ${msg}`)
      } else {
        console.log(`${chalk.green.bold(`${paddedPackageName}:`)} ${msg}`)
      }
    })
  })
}

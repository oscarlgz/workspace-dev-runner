import { OptionValues } from 'commander'
import tempy from 'tempy'

export const createLogFiles = (options: OptionValues) => {
  const logs = options.packageName.reduce((acc, packageName) => {
    acc[packageName] = tempy.file()

    return acc
  }, {})
}

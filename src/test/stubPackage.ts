import { PackageInfo } from '../types'

export const stubPackage = (
  name: string,
  deps: string[] = [],
  override?: Partial<PackageInfo>
): PackageInfo => ({
  name,
  packageJsonPath: `packages/${name}`,
  version: '1.0',
  dependencies: deps.reduce((depMap, dep) => ({ ...depMap, [dep]: '*' }), {}),
  devDependencies: {},
  ...override,
})

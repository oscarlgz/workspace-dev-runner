import { stubPackage } from './stubPackage'

export const dependencyMap = {
  server: stubPackage('server', ['a', 'b', 'c'], {
    scripts: {
      start: 'runtime',
    },
  }),
  app: stubPackage('app', ['b', 'c'], {
    scripts: {
      start: 'runtime',
    },
  }),
  a: stubPackage('a', ['b', 'c']),
  b: stubPackage('b'),
  c: stubPackage('c', ['b']),
}

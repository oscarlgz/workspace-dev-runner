import { dependencyMap } from '../test/data'
import { filterOutRuntimePackages } from './workspace'

describe('filterOutRuntimePackages', () => {
  it('should', () => {
    expect(filterOutRuntimePackages(Object.keys(dependencyMap), dependencyMap)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})

import { dependencyMap } from '../test/data'
import { getOrderedDependentsForPackage } from './dependencies'

describe('getOrderedDependentsForPackage', () => {
  it('should', () => {
    expect(getOrderedDependentsForPackage('c', dependencyMap)).toEqual(['a', 'server', 'app'])
  })
})

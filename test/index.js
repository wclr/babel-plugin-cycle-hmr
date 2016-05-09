import assert from 'assert'
import transform from './transform'

describe('HMR Proxy', () => {
  transform(({actual, expected, caseName}) => {
    it(`handles ${caseName.split('-').join(' ')} case`, () => {
      assert.equal(actual, expected)
    })
  })
})
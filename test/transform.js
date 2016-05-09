import fs from 'fs'
import path from 'path'
import { transformFileSync } from 'babel-core'
import plugin from '../rx'

function trim(str) {
  return str.replace(/^\s+|\s+$/, '')
}

const fixturesDir = path.join(__dirname, 'fixtures')

export const transformFixtures = (handler) => {
  fs.readdirSync(fixturesDir)
    .filter(path => !/^_/.test(path))
    //.filter(path => /test-export-name/.test(path))
    .map((caseName) => {
      var lib = caseName.split('-')[0]
      const options = {
        babelrc: false,
        plugins: [
          [plugin, {
            moduleIdName: /module-id-name/.test(caseName),
            modulePath: /module-id-name/.test(caseName),
            testExportName: /test-export-name/.test(caseName) ? '^[A-Z]/m' : false,
            import: /import/.test(caseName),
            accept: /accept/.test(caseName),
            include: '**/fixtures/**',
            exclude: '**/exclude*/**',
            proxy: /proxy-options/.test(caseName) ? {debug: 'info'} : undefined,
            lib: lib
          }]
        ]
      }
      const fixtureDir = path.join(fixturesDir, caseName)
      const actualPath = path.join(fixtureDir, 'source.js')
      const expectedPath = path.join(fixtureDir, 'transformed.js')
      let actual
      try {
        actual = trim(transformFileSync(actualPath, options).code)
      } catch (e) {
        console.error(e.message, e.stack)
      }

      const expected = fs.existsSync(expectedPath)
          && trim(fs.readFileSync(expectedPath, 'utf-8'))

      handler && handler({caseName, actual, expected, expectedPath})
    })
}

export default transformFixtures

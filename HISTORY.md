### v0.3.1
    * fixed specific lib plugin attach
### v0.3.0
    * added `testExportName` - string regexp or function
### v0.2.2
    * skip `export {...} from ...`
### v0.2.1
    * fix double proxying of named exports
    * split tests for separate cases
### v0.2.0 
    * added ability to plugin library specific version
    * added handling of `global.noCycleHmr`
    * added error handling in `hot.accept`
### v0.1.1 Bug fix
### v0.1.0 Imports insertion and rxjs/most support 
    * imports of `Subject` object are added if not found
    * added initial most.js and rxjs5 support    

### v0.0.1 Initial pre-release 
    * only rx@4.x.x 
    * requires `Rx` or `Subject` reference
    * no tests released
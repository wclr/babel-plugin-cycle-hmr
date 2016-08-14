import includeExclude from 'include-exclude'
import * as t from 'babel-types'
import path from 'path'

const defaultWrapperName = 'hmrProxy'
let warnedAboutInclude = false

const getWrapperName = (importWrapper = defaultWrapperName) => {
  return '__' + importWrapper
}

const getRelativePath = (filename) =>
  path.relative(process.cwd(), filename).replace(/\\/g, '/')

const getRelativeName = (filename, keepExt) => {
  const relName = getRelativePath(filename)
    .split('/').join('_')
  return keepExt ? relName : relName.replace(/\..+$/, '')
}

const processTestParam = (testParam, name) => {
  if (typeof testParam === 'string'){
    const split = testParam.split('/')
    return new RegExp(split[0], split[1])
  }
  if (typeof testParam === 'function'){
    return {test: testParam}
  }
  if (testParam && testParam.test !== 'function'){
    throw new Error(`Illegal test param '${name}', should be RegExp or function`)
  }
  return testParam
}

export const addImport =
  (node, importWrapper = defaultWrapperName, importFrom = 'cycle-hmr') => {
    const importLiteral = importWrapper
    const importLocalLiteral = getWrapperName(importWrapper)
    let importIdentifier = t.identifier(importLiteral)
    let importLocalIdentifier = t.identifier(importLocalLiteral)

    const importDeclaration = t.importDeclaration([
      t.importSpecifier(importLocalIdentifier, importIdentifier)
    ], t.stringLiteral(importFrom));
    node.body.unshift(importDeclaration);
  }

const addHotAccept = (node) => {
  const acceptCall = t.callExpression(
    t.memberExpression(t.identifier('module.hot'), t.identifier('accept')),
    [t.identifier('function(err) {err && console.error(\'Can not accept module: \' + err.message)}')]
  )
  const statement = t.ifStatement(
    t.identifier('(typeof module === "object" && module.hot) && !(typeof global === "object" && global.noCycleHmr)'),
    t.expressionStatement(acceptCall)
  )
  node.body.unshift(statement);
}

const findComments = function(test, comments, options){
  return comments.reduce((prev, {value}) =>
    prev || test.test(value), false
  )
}

const findIncludeComment = (comments, options) =>

  findComments(/@cycle-hmr/, comments, options)

const findDebugComment = (comments, options) =>
  findComments(/@cycle-hmr-debug/, comments, options)

const findExcludeComment = (comments, options) =>
  findComments(/@no-cycle-hmr/, comments, options)

export default function ({types: t}) {
  const makeVisitor = (scope, options) => {
    const moduleIdName = options.moduleIdName
      ? options.moduleIdName + '_' : ''
    const wrapIdentifier = t.identifier(getWrapperName(options.importWrapper))
    const testExportName = options.testExportName
    const skipExportName = (name) => {
      if (testExportName){
        return !testExportName.test(name.toString())
      }
      return false
    }


    const wrap = (node, wrappedName) => {
      scope.__hasCycleHmr = true
      let proxyOptions = options.proxy || {}
      if (proxyOptions.modulePath) {
        proxyOptions = {...options.proxy, exportName: wrappedName}
      }

      return t.callExpression(wrapIdentifier, [
        node, t.binaryExpression('+',
          t.identifier('(typeof module === "object" ? module.id : "")'), t.stringLiteral('_' + moduleIdName + wrappedName)
        )
      ].concat(t.identifier(JSON.stringify(proxyOptions))))
    }
    const wrapAndReplace = (path, name) => {
      var wrapped = wrap(path.node, name)
      return path.replaceWith(wrapped)
    }

    const exportFunctionDeclaration = (path, isDefault) => {
      if (path.__hmrWrapped) return
      const declaration = path.node.declaration
      const name = declaration.id ? declaration.id.name : 'default__hmr'
      const proxiedIdentifier = t.identifier(name)
      const proxiedDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
          proxiedIdentifier,
          t.functionExpression(null, declaration.params,
            declaration.body,
            declaration.generator, declaration.async)
        )
      ])

      path.insertBefore(proxiedDeclaration)
      if (isDefault){
        path.replaceWith(t.exportDefaultDeclaration(
          proxiedIdentifier
        ))
      } else {
        path.replaceWith(t.exportNamedDeclaration(
        null, [
            t.exportSpecifier(
              proxiedIdentifier,
              proxiedIdentifier
            )
          ]
        ))
      }
    }

    const detachNamedExport = (path, name) => {
      if (skipExportName(name)) return
      let declarationPath = path.parentPath.parentPath
      let exportPath = declarationPath.parentPath
      exportPath.insertBefore(declarationPath.node)
      exportPath.replaceWith(t.exportNamedDeclaration(
        null, [
          t.exportSpecifier(
            //proxiedIdentifier,
            t.identifier(name),
            t.identifier(name)
          )
        ]
      ))
    }

    return {
      // find:
      //    export default ....
      ExportDefaultDeclaration (path) {
        if (path.__hmrWrapped) return

        if (skipExportName('default')) return

        // filter (named) functions:
        //    export default function () {...}
        //    export default function X () {...}
        if (path.node.declaration.type === 'FunctionDeclaration'){
          exportFunctionDeclaration(path, true)
          return
        }

        path.replaceWith(t.ExportDefaultDeclaration(
          wrap(path.node.declaration, 'default')
        ))

        path.__hmrWrapped = true
      },
      // find:
      //    export {X as Y}
      // turn to:
      //    const Y__hmr = hmrProxy(X, id)
      //    export {Y__hmr as Y}
      ExportSpecifier (path){
        if (path.__hmrWrapped) return
        // skip:
        //    export {X} from './X'
        if (path.parentPath.node.source){
          return
        }
        if (skipExportName(path.node.exported.name)) return
        const proxiedIdentifier = t.identifier(path.node.exported.name + '__hmr')
        const proxiedDeclaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            proxiedIdentifier,
            wrap(path.node.local, path.node.exported.name)
          )
        ])
        let parentPath = path.parentPath
        parentPath.insertBefore(proxiedDeclaration)

        path.replaceWith(t.exportSpecifier(proxiedIdentifier, path.node.exported))
        path.__hmrWrapped = true
      },
      // find:
      //    export const X = ....
      ExportNamedDeclaration (path) {
        if (path.__hmrWrapped) return
        const declarations = []
        const doWrap = (path) => declarations
            .filter(d => d === path.parentPath.node)[0]
        // find:
        //    export const X = (...) => ...
        // or
        //    export const X = function (....) { ...
        // turn to
        //    export const X = hmrProxy((...) => ..., id) ???
        //    ----
        //    const X = (...) => ...
        //    export hmrProxy(X)
        let exportVisitors = {
          'FunctionExpression|ArrowFunctionExpression' (path) {
            let dec = doWrap(path)
            if (dec){
              //wrapAndReplace(path, dec.id.name)
              detachNamedExport(path, dec.id.name)
            }
          }
        }
        let declaration = path.node.declaration
        if (declaration){
          if (declaration.declarations){
            declaration.declarations
              .forEach((declaration) => {
                declarations.push(declaration)
              })
            path.traverse(exportVisitors)
          } else {
            if (declaration.type == 'FunctionDeclaration'){
              exportFunctionDeclaration(path)
            }
          }
        }
      }
    }
  }

  return  {
    visitor: {
      Program (path, state) {
        const scope = path.context.scope
        const options = {
          testExportName: false,
          moduleIdName: true,
          moduleIdNameExt: false,
          modulePath: true,
          proxy: {},
          ...this.opts
        }

        const filename = this.file.opts.filename

        options.testExportName =
          processTestParam(options.testExportName, 'testExportName')

        const hasFilter = options.include || options.exclude
        const comments = path.container.comments
        const hasIncludeComment = findIncludeComment(comments, options)

        if (hasFilter){
          const passFilter = includeExclude(options)
          if (passFilter(filename)){
            if (findExcludeComment(comments, options)){
              return
            }
          } else if (!hasIncludeComment){
            return
          }
        } else {
          if (!warnedAboutInclude
            && options.include === undefined && options.exclude === undefined) {
            console.warn('You are using \`cycle-hmr\` babel plugin ' +
              'without include/exclude options, so no modules ' +
              'except marked with /* @cycle-hmr */ comment will be processed.' +
              ' You were warned.')
            warnedAboutInclude = true
          }
          if (!hasIncludeComment){
            return
          }
        }

        if (!options.debug && hasIncludeComment && findDebugComment(comments)){
          options.debug = true
        }

        if (options.moduleIdName){
          options.moduleIdName = getRelativeName(filename, options.moduleIdNameExt)
        }

        if (options.modulePath){
          options.proxy = {
            modulePath: getRelativePath(filename),
            ...options.proxy
          }
        }

        path.traverse(makeVisitor(scope, options))
      
        if (scope.__hasCycleHmr && options.import !== false){
          addImport(path.node, options.importWrapper, options.importFrom)
        }

        if (scope.__hasCycleHmr && options.accept !== false){
          addHotAccept(path.node)
        }
      }
    }
  }
}

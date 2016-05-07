'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addImport = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = function (_ref2) {
  var t = _ref2.types;

  var makeVisitor = function makeVisitor(scope, moduleIdName, options) {
    moduleIdName = moduleIdName ? moduleIdName + '_' : '';
    var wrapIdentifier = t.identifier(getWrapperName(options.importWrapper));

    var wrap = function wrap(node, wrappedName) {
      scope.__hasCycleHmr = true;
      return t.callExpression(wrapIdentifier, [node, t.binaryExpression('+', t.identifier('module.id'), t.stringLiteral('_' + moduleIdName + wrappedName))].concat(options.proxy ? t.identifier(JSON.stringify(options.proxy)) : []));
    };
    var wrapAndReplace = function wrapAndReplace(path, name) {
      scope.__hasCycleHmr = true;
      var wrapped = wrap(path.node, name);
      return path.replaceWith(wrapped);
    };

    var exportFunctionDeclaration = function exportFunctionDeclaration(path, isDefault) {
      if (path.__hmrWrapped) return;
      var declaration = path.node.declaration;
      var name = declaration.id ? declaration.id.name : 'default__hmr';
      var proxiedIdentifier = t.identifier(name);
      var proxiedDeclaration = t.variableDeclaration('const', [t.variableDeclarator(proxiedIdentifier, t.functionExpression(null, declaration.params, declaration.body, declaration.generator, declaration.async))]);

      path.insertBefore(proxiedDeclaration);
      if (isDefault) {
        path.replaceWith(t.exportDefaultDeclaration(proxiedIdentifier));
      } else {
        path.replaceWith(t.exportNamedDeclaration(null, [t.exportSpecifier(proxiedIdentifier, proxiedIdentifier)]));
      }
    };

    var detachNamedWrapAndReplace = function detachNamedWrapAndReplace(path, name) {
      var declarationPath = path.parentPath.parentPath;
      var exportPath = declarationPath.parentPath;
      exportPath.insertBefore(declarationPath.node);
      exportPath.replaceWith(t.exportNamedDeclaration(null, [t.exportSpecifier(
      //proxiedIdentifier,
      t.identifier(name), t.identifier(name))]));
    };

    return {
      // find:
      //    export default ....

      ExportDefaultDeclaration: function ExportDefaultDeclaration(path) {
        if (path.__hmrWrapped) return;

        // filter (named) functions:
        //    export default function () {...}
        //    export default function X () {...}
        if (path.node.declaration.type === 'FunctionDeclaration') {
          exportFunctionDeclaration(path, true);
          return;
        }

        path.replaceWith(t.ExportDefaultDeclaration(wrap(path.node.declaration, 'default')));
        path.__hmrWrapped = true;
      },

      // find:
      //    export {X as Y}
      // turn to:
      //    const Y__hmr = hmrProxy(X, id)
      //    export {Y__hmr as Y}
      ExportSpecifier: function ExportSpecifier(path) {
        if (path.__hmrWrapped) return;
        // skip:
        //    export {X} from './X'
        if (path.parentPath.node.source) {
          return;
        }
        var proxiedIdentifier = t.identifier(path.node.exported.name + '__hmr');
        var proxiedDeclaration = t.variableDeclaration('const', [t.variableDeclarator(proxiedIdentifier, wrap(path.node.local, path.node.exported.name))]);
        var parentPath = path.parentPath;
        parentPath.insertBefore(proxiedDeclaration);

        path.replaceWith(t.exportSpecifier(proxiedIdentifier, path.node.exported));
        path.__hmrWrapped = true;
      },

      // find:
      //    export const X = ....
      ExportNamedDeclaration: function ExportNamedDeclaration(path) {
        if (path.__hmrWrapped) return;
        var declarations = [];
        var doWrap = function doWrap(path) {
          return declarations.filter(function (d) {
            return d === path.parentPath.node;
          })[0];
        };
        // find:
        //    export const X = (...) => ...
        // or
        //    export const X = function (....) { ...
        // turn to
        //    export const X = hmrProxy((...) => ..., id) ???
        //    ----
        //    const X = (...) => ...
        //    export hmrProxy(X)
        var exportVisitors = {
          'FunctionExpression|ArrowFunctionExpression': function FunctionExpressionArrowFunctionExpression(path) {
            var dec = doWrap(path);
            if (dec) {
              //wrapAndReplace(path, dec.id.name)
              detachNamedWrapAndReplace(path, dec.id.name);
            }
          }
        };
        var declaration = path.node.declaration;
        if (declaration) {
          if (declaration.declarations) {
            declaration.declarations.forEach(function (declaration) {
              declarations.push(declaration);
            });
            path.traverse(exportVisitors);
          } else {
            if (declaration.type == 'FunctionDeclaration') {
              exportFunctionDeclaration(path);
            }
          }
        }
      }
    };
  };

  return {
    visitor: {
      Program: function Program(path, state) {
        var scope = path.context.scope;
        var options = _extends({
          addModuleName: true
        }, this.opts);
        var filename = this.file.opts.filename;

        var hasFilter = options.include || options.exclude;
        var comments = path.container.comments;
        var hasIncludeComment = findIncludeComment(comments, options);

        if (hasFilter) {
          var passFilter = (0, _includeExclude2.default)(options);
          if (passFilter(filename)) {
            if (findExcludeComment(comments, options)) {
              return;
            }
          } else if (!hasIncludeComment) {
            return;
          }
        } else {
          if (!hasIncludeComment) {
            return;
          }
        }

        if (!options.debug && hasIncludeComment && findDebugComment(comments)) {
          options.debug = true;
        }

        var moduleIdName = options.addModuleName ? getRelativeName(filename) : '';
        path.traverse(makeVisitor(scope, moduleIdName, options));

        if (scope.__hasCycleHmr && options.import !== false) {
          addImport(path.node, options.importWrapper, options.importFrom);
        }

        if (scope.__hasCycleHmr && options.accept !== false) {
          addHotAccept(path.node);
        }
      }
    }
  };
};

var _includeExclude = require('include-exclude');

var _includeExclude2 = _interopRequireDefault(_includeExclude);

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultWrapperName = 'hmrProxy';

var getWrapperName = function getWrapperName() {
  var importWrapper = arguments.length <= 0 || arguments[0] === undefined ? defaultWrapperName : arguments[0];

  return '__' + importWrapper;
};

var getRelativeName = function getRelativeName(filename) {
  return _path2.default.relative(process.cwd(), filename).split(_path2.default.sep).join('_').replace(/\..+$/, '');
};

var addImport = exports.addImport = function addImport(node) {
  var importWrapper = arguments.length <= 1 || arguments[1] === undefined ? defaultWrapperName : arguments[1];
  var importFrom = arguments.length <= 2 || arguments[2] === undefined ? 'cycle-hmr' : arguments[2];

  var importLiteral = importWrapper;
  var importLocalLiteral = getWrapperName(importWrapper);
  var importIdentifier = t.identifier(importLiteral);
  var importLocalIdentifier = t.identifier(importLocalLiteral);

  var importDeclaration = t.importDeclaration([t.importSpecifier(importLocalIdentifier, importIdentifier)], t.stringLiteral(importFrom));
  node.body.unshift(importDeclaration);
};

var addHotAccept = function addHotAccept(node) {
  var acceptCall = t.callExpression(t.memberExpression(t.identifier('module.hot'), t.identifier('accept')), [t.identifier('(err) => {err && console.error(`Can not accept module: ` + err.message)}')]);
  var statement = t.ifStatement(t.identifier('module.hot && !global.noCycleHmr'), t.expressionStatement(acceptCall));
  node.body.unshift(statement);
};

var findComments = function findComments(test, comments, options) {
  return comments.reduce(function (prev, _ref) {
    var value = _ref.value;
    return prev || test.test(value);
  }, false);
};

var findIncludeComment = function findIncludeComment(comments, options) {
  return findComments(/@cycle-hmr/, comments, options);
};

var findDebugComment = function findDebugComment(comments, options) {
  return findComments(/@cycle-hmr-debug/, comments, options);
};

var findExcludeComment = function findExcludeComment(comments, options) {
  return findComments(/@no-cycle-hmr/, comments, options);
};
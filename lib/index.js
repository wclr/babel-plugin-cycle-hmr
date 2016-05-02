'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addImport = undefined;

exports.default = function (_ref2) {
  var t = _ref2.types;


  var makeVisitor = function makeVisitor(scope, moduleIdName, options) {
    var wrapIdentifier = t.identifier(getWrapperName(options.importWrapper));
    var wrap = function wrap(node, name) {
      scope.__hasCycleHmr = true;
      return t.callExpression(wrapIdentifier, [node, t.binaryExpression('+', t.identifier('module.id'), t.stringLiteral('_' + moduleIdName + '_' + name))].concat(options.proxy ? t.identifier(JSON.stringify(options.proxy)) : []));
    };
    var wrapAndReplace = function wrapAndReplace(path, name) {
      scope.__hasCycleHmr = true;
      var wrapped = wrap(path.node, name);
      return path.replaceWith(wrapped);
    };

    var exportFunctionDeclaration = function exportFunctionDeclaration(path, isDefault) {
      if (path.__hmrWrapped) return;
      var declaration = path.node.declaration;
      var name = declaration.id.name;
      var proxiedIdentifier = t.identifier(name);
      var proxiedDeclaration = t.variableDeclaration('const', [t.variableDeclarator(proxiedIdentifier,
      // wrap(t.functionExpression(null, declaration.params,
      //   declaration.body,
      //   declaration.generator, declaration.async), name)
      t.functionExpression(null, declaration.params, declaration.body, declaration.generator, declaration.async))]);

      path.insertBefore(proxiedDeclaration);
      if (isDefault) {
        path.replaceWith(t.exportDefaultDeclaration(proxiedIdentifier));
      } else {
        path.replaceWith(t.exportNamedDeclaration(null, [t.exportSpecifier(proxiedIdentifier, proxiedIdentifier)]));
      }
    };

    return {
      ExportDefaultDeclaration: function ExportDefaultDeclaration(path) {
        if (path.__hmrWrapped) return;

        if (path.node.declaration.type === 'FunctionDeclaration') {
          exportFunctionDeclaration(path, true);
          return;
        }

        path.replaceWith(t.ExportDefaultDeclaration(wrap(path.node.declaration, 'default')));
        path.__hmrWrapped = true;
      },
      ExportSpecifier: function ExportSpecifier(path) {
        if (path.__hmrWrapped) return;
        var proxiedIdentifier = t.identifier(path.node.exported.name + '__hmr');
        var proxiedDeclaration = t.variableDeclaration('const', [t.variableDeclarator(proxiedIdentifier, wrap(path.node.local, path.node.exported.name))]);
        var parentPath = path.parentPath;
        parentPath.insertBefore(proxiedDeclaration);

        path.replaceWith(t.exportSpecifier(proxiedIdentifier, path.node.exported));
        path.__hmrWrapped = true;
      },
      ExportNamedDeclaration: function ExportNamedDeclaration(path) {
        if (path.__hmrWrapped) return;
        var declarations = [];
        var doWrap = function doWrap(path) {
          return declarations.filter(function (d) {
            return d === path.parentPath.node;
          })[0];
        };
        var exportVisitors = {
          'FunctionExpression|ArrowFunctionExpression': function FunctionExpressionArrowFunctionExpression(path) {
            var dec = doWrap(path);
            if (dec) {
              wrapAndReplace(path, dec.id.name);
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
        var options = this.opts;
        var filename = this.file.opts.filename;

        var filter = (0, _includeExclude2.default)(options);
        var hasFilter = options.include || options.exclude;
        var comments = path.container.comments;
        if (!filter(filename)) {
          if (hasFilter) {
            if (!checkIncludeComments(comments, options)) {
              return;
            }
          }
          return;
        }

        if (!hasFilter) {
          if (checkExcludeComments(comments, options)) {
            return;
          }
        }

        var moduleIdName = getRelativeName(filename);
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
  var acceptCall = t.callExpression(t.memberExpression(t.identifier('module.hot'), t.identifier('accept')), []);
  var statement = t.ifStatement(t.identifier('module.hot'), t.expressionStatement(acceptCall));
  node.body.unshift(statement);
};

var checkComments = function checkComments(test, comments, options) {
  return comments.reduce(function (prev, _ref) {
    var value = _ref.value;
    return prev || test.test(value);
  }, false);
};

var checkIncludeComments = function checkIncludeComments(comments, options) {
  return checkComments(/@cycle-hmr/, comments, options);
};

var checkExcludeComments = function checkExcludeComments(comments, options) {
  return checkComments(/@no-cycle-hmr/, comments, options);
};
if (module.hot && !global.noCycleHmr) module.hot.accept((err) => {err && console.error(`Can not accept module: ` + err.message)});
import { hmrProxy as __hmrProxy } from 'cycle-hmr/rx';
/* @cycle-hmr */
import { Observable } from 'rx';
import { Imported } from 'Imporeted';
import { isolate } from 'isolate';

const x = 1;

const Component1 = ({ DOM, HTTP: string }) => {};

function Component2({ DOM, HTTP: string }) {}

/* ExportNamedDeclaration */
// ArrowFunctionExpression
export const NamedComponentArrow = __hmrProxy(({ DOM, HTTP: string }) => {}, module.id + '_NamedComponentArrow');

// FunctionExpression
export const NamedComponentFuncExp = __hmrProxy(function ({ DOM, HTTP: string }) {}, module.id + '_NamedComponentFuncExp');

// FunctionDeclaration

const NameExportFunctionDeclaration = function ({ DOM, HTTP: string }) {};

const NameExportFunctionDeclaration__hmr = __hmrProxy(NameExportFunctionDeclaration, module.id + '_NameExportFunctionDeclaration');

export { NameExportFunctionDeclaration__hmr as NameExportFunctionDeclaration };

const DefaultExportFunctionDeclaration = function ({ DOM, HTTP: string }) {};

export default __hmrProxy(DefaultExportFunctionDeclaration, module.id + '_default');

// string (should not wrap)

export const str = 'string';

/* ExportSpecifier */

const X__hmr = __hmrProxy(Component1, module.id + '_X');

export { X__hmr as X };

const Component1__hmr = __hmrProxy(Component1, module.id + '_Component1');

const x__hmr = __hmrProxy(x, module.id + '_x');

export { Component1__hmr as Component1, x__hmr as x };

// ExportDefaultSpecifier

const default__hmr = __hmrProxy(Component2, module.id + '_default');

export { default__hmr as default };

export default __hmrProxy(({ DOM, HTTP: string }) => {}, module.id + '_default');
export default __hmrProxy(isolate(Component3), module.id + '_default');
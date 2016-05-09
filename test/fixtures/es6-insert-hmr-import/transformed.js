import { hmrProxy as __hmrProxy } from 'cycle-hmr/rx';
import { Observable } from 'rx';
import { Imported } from 'Imporeted';

const X = () => {};

const X__hmr = __hmrProxy(X, (typeof module === "object" ? module.id : "") + '_X', {});

export { X__hmr as X };
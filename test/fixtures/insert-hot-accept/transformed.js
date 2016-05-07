if (module.hot && !global.noCycleHmr) module.hot.accept((err) => {err && console.error(`Can not accept module: ` + err.message)});
import { Observable } from 'rx';
import { Imported } from 'Imporeted';

const X = a => {};

const X__hmr = __hmrProxy(X, module.id + '_X');

export { X__hmr as X };
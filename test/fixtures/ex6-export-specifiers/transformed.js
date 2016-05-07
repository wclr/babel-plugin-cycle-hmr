const X = 1;
const F = () => {};
function f() {}

const Y__hmr = __hmrProxy(X, module.id + "_Y");

const A__hmr = __hmrProxy(F, module.id + "_A");

const f__hmr = __hmrProxy(f, module.id + "_f");

export { Y__hmr as Y, A__hmr as A, f__hmr as f };
const ProxyThis = function (a) {};

const ProxyThis__hmr = __hmrProxy(ProxyThis, (typeof module === "object" ? module.id : "") + "_ProxyThis", {});

export { ProxyThis__hmr as ProxyThis };
export const doNotProxy = function (a) {}; // should not proxy

const X = () => {};

export { X as doNotX }; // should not proxy

const Y = () => {};

const DoY__hmr = __hmrProxy(Y, (typeof module === "object" ? module.id : "") + "_DoY", {});

export { DoY__hmr as DoY };

export default function (a) {} // should not proxy
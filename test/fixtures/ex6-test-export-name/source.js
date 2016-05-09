export const ProxyThis = function(a) {}
export const doNotProxy = function(a) {} // should not proxy

const X = () => {}

export {X as doNotX} // should not proxy

const Y = () => {}

export {Y as DoY}


export default function(a) {} // should not proxy
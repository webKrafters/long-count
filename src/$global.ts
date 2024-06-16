// @ts-nocheck

type NoOp = typeof noop;

export type Global<T = typeof env> = T & Omit<Window, keyof T> & {
    console: T["console"] extends unknown ? { warn: NoOp } : T["console"];
}

import { noop } from './util/index';

const env = typeof window !== 'undefined'
    ? window : typeof self !== 'undefined'
    ? self : typeof global !== 'undefined'
    ? global : typeof globalThis !== 'undefined'
    ? globalThis : {};

export const $global : Global = env;
for( let k of [ 'clearInterval', 'clearTimeout', 'setInterval', 'setTimeout' ] ) {
    if( typeof $global[ k ] === 'undefined' ) { $global[ k ] = noop }
}
if( typeof $global.console === 'undefined' ) { $global.console = { warn: noop } }
if( typeof $global.document === 'undefined' ) {
    $global.document = {
        addEventListener: noop,
        removeEventListener: noop
    };
}
if( typeof $global.document.addEventListener === 'undefined' ) {
    $global.document.addEventListener = noop;
}
if( typeof $global.document.removeEventListener === 'undefined' ) {
    $global.document.removeEventListener = noop;
}

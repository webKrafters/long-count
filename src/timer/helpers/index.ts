import { $global } from '../../$global';
import type { Delay, DelayTypeName, MyInteger } from '../../types';

import { getTypeName } from '../../util/index';

import { fromString, toMyInteger } from '../../util/uint8array/index';

export const BASIC_TYPES = Object.freeze({
    Number: 1,
    String: 1,
    BigInt: 1,
    Uint8Array: 1,
    Undefined: 1
}); 
    
export const getValidDelayTypeName = ( delay: Delay ) : DelayTypeName => {
    const type = getTypeName( delay );
    return (
        type in BASIC_TYPES
            ? type
            : typeof delay?.[ Symbol.iterator ] === 'function'
                ? 'Iterable'
                : 'Invalid'
    ) as DelayTypeName;
};

export function sanitizeDelay( delay: Uint8Array ) : MyInteger;
export function sanitizeDelay( delay: Iterable<number> ) : MyInteger;
export function sanitizeDelay( delay: Delay ) : MyInteger;
export function sanitizeDelay( delay: any ) {
    switch( getValidDelayTypeName( delay ) ) {
        case 'Number': return parseInt( delay as string );
        case 'BigInt': { delay = `${ delay }` }
        case 'String': return toMyInteger( fromString( delay as string ) );
        case 'Iterable': return sanitizeIterable( delay );
        case 'Uint8Array': return sanitizeIterable( delay, true );
    }
};

function sanitizeIterable( iterable : Uint8Array, isUint8Array? : boolean ) : MyInteger;
function sanitizeIterable( iterable : Iterable<number>, isUint8Array : boolean = false ) : MyInteger|void {
    for( let item of iterable ) {
        if( !( Number.isInteger( item ) && item > -1 && item < 10 ) ) {
            return $global.console.warn( 'Delay iterable accepts single digit integers. Defaulting to undefined at this time.' );
        }
    }
    return toMyInteger( isUint8Array ? iterable as Uint8Array : new Uint8Array( iterable ) );
}

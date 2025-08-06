import type { Delay, DelayTypeName, MyInteger } from '../../index';

import { getTypeOf } from '../../util/index';

import { fromScalar, toMyInteger } from '../../util/uint8array/index';

export const BASIC_TYPES = Object.freeze({
    Number: 1,
    String: 1,
    BigInt: 1,
    Uint8Array: 1,
    Undefined: 1
}); 
    
export const getTypeOfValidDelay = ( delay: Delay ) : DelayTypeName => {
    const type = getTypeOf( delay );
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
    let myInteger : MyInteger;
    try {
        switch( getTypeOfValidDelay( delay ) ) {
            case 'Undefined': return delay;
            case 'Number': myInteger = parseInt( delay as string ); break;
            case 'BigInt': { delay = `${ delay }` }
            case 'String': myInteger = toMyInteger( fromScalar( delay as string ) ); break;
            case 'Iterable': myInteger = sanitizeIterable( delay ); break;
            case 'Uint8Array': myInteger = sanitizeIterable( delay, true );
        }
    } catch( e ) { if( e.constructor !== SyntaxError ) { throw e } }
    if( myInteger === undefined ) {
        throw new TypeError( 'Invalid delay argument type. Expected types: undefined | non-negative integer | non-negative integer string | non-negative BigInt | any iterable containing single digit non-negative integer per element.' );
    }
    return myInteger;
};

function sanitizeIterable( iterable : Uint8Array, isUint8Array? : boolean ) : MyInteger;
function sanitizeIterable( iterable : Iterable<number>, isUint8Array : boolean = false ) : MyInteger|void {
    const invalidMessage = 'Each element of an iterable `delay` only accepts an integer: 0 - 9.';
    let count = 0;
    for( let item of iterable ) {
        count++;
        if( !( Number.isInteger( item ) && item > -1 && item < 10 ) ) {
            throw new TypeError( invalidMessage );
        }
    }
    if( count < 1 ) { throw new TypeError( invalidMessage ) }
    return toMyInteger( isUint8Array ? iterable as Uint8Array : new Uint8Array( iterable ) );
}

import type { VoidFn } from '../index';

const FROM_STRING_PATTERN = /\s(\w+)\]$/;

const MY_INTEGER_PATTERN = /(?:^Number$)|(?:^Uint8Array$)/;

const toString = Object.prototype.toString;

export const getTypeOf = <T = any>( value : T ) : string => toString.call( value ).match( FROM_STRING_PATTERN )[ 1 ];

export function getTypeOfMyInteger( value ) : "Invalid" | "Number" | "Uint8Array" {
    const typeName = getTypeOf( value ) as "Invalid" | "Number";
    return MY_INTEGER_PATTERN.test( typeName ) ? typeName : 'Invalid'
};

export const noop : VoidFn = ( ...args ) => {};

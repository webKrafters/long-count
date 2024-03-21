import type { VoidFn } from "../types";

const FROM_STRING_PATTERN = /\s(\w+)\]$/;

const toString = Object.prototype.toString;

export const getTypeName = <T = any>( value : T ) : string => toString.call( value ).match( FROM_STRING_PATTERN )[ 1 ];

export const noop : VoidFn = ( ...args ) => {};

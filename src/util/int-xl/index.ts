import type { DelayTypeName, MyInteger } from '../../types';

interface TypedData {
    type: DelayTypeName,
    value: MyInteger
}

type Operator = 'add'|'subtract';

import { getTypeOfMyInteger } from '../index';

import * as intArray from '../uint8array/index';

export const deps = { intArray };

export const add = (
    adder? : MyInteger,
    addend? : MyInteger
) : MyInteger => {
    const d = normalizeOperands( adder, addend );
    if( !d.length ) { return }
    if( d.some(({ type }) => type !== 'Number' ) ) {
        return deps.intArray.toMyInteger( doMath( 'add', d[ 0 ], d[ 1 ] ) ); 
    }
    const adderN = d[ 0 ].value as number;
    const addendN =  d[ 1 ].value as number;
    if( Number.MAX_SAFE_INTEGER - adderN < addendN ) {
        return doMath( 'add', d[ 0 ], d[ 1 ] );
    }
    const sum = adderN + addendN;
    return sum > 0 ? sum : 0;
}

export const subtract = (
    subtractor? : MyInteger,
    subtrahend? : MyInteger
) : MyInteger => {
    const d = normalizeOperands( subtractor, subtrahend ); 
    if( !d.length ) { return }
    const isSubtractorN = d[ 0 ].type === 'Number';
    const isSubtrahendN = d[ 1 ].type === 'Number';
    if( isSubtractorN && !isSubtrahendN ) { return 0 }
    if( !isSubtractorN || !isSubtrahendN ) {
        const diff = deps.intArray.toMyInteger( doMath( 'subtract', d[ 0 ], d[ 1 ] ) );
        // istanbul ignore next
        return getTypeOfMyInteger( diff ) === 'Uint8Array' || diff as number > 0 ? diff : 0;
    }
    const diff = ( d[ 0 ].value as number ) - ( d[ 1 ].value as number );
    return diff > 0 ? diff : 0;
}

function doMath(
    operator : Operator,
    operand1 : TypedData,
    operand2 : TypedData
) : Uint8Array {
    return deps.intArray[ operator ](
        toUint8Array( operand1 ),
        toUint8Array( operand2 )
    );
}

function normalizeOperands(
    operand1? : MyInteger,
    operand2? : MyInteger
) : Array<TypedData> {
    const t : Array<TypedData> = [];
    t.push({ type: getTypeOfMyInteger( operand1 ), value: operand1 });
    if( t[ 0 ].type === 'Invalid' ) { return [] }
    t.push({ type: getTypeOfMyInteger( operand2 ), value: operand2 });
    if( t[ 1 ].type === 'Invalid' ) { return [] }
    const normalizeToInteger = index => {
        if( t[ index ].type === 'Number' ) { return }
        t[ index ].value = deps.intArray.toMyInteger( t[ index ].value as Uint8Array );
        t[ index ].type = getTypeOfMyInteger( t[ index ].value );
    }
    normalizeToInteger( 0 );
    normalizeToInteger( 1 );
    return t;
}

function toUint8Array( data : TypedData ) {
    return data.type === 'Number'
        ? deps.intArray.fromScalar( data.value as number )
        : data.value as Uint8Array
}
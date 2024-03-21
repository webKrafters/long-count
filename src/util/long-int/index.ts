import type { MyInteger } from '../../types';

import { getTypeName } from '../index';

import { getValidDelayTypeName } from '../../timer/helpers/index';

import * as intArray from '../uint8array/index';

type Operator = 'add'|'subtract';

export const add = (
    adder? : MyInteger,
    addend? : MyInteger
) : MyInteger => {
    const types = typeOperands( adder, addend ); 
    if( !types.length ) { return }
    if( types[ 0 ] === 'Number' && types[ 1 ] === 'Number' ) {
        const adderN = adder as number;
        const addendN = addend as number;
        const sum = adderN + addendN;
        if( Number.MAX_SAFE_INTEGER - adderN >= addendN ) { return sum }
    }
    return intArray.toMyInteger( doMath( 'add', adder, addend ) ); 
}

export const subtract = (
    subtractor? : MyInteger,
    subtrahend? : MyInteger
) : MyInteger => {
    const types = typeOperands( subtractor, subtrahend ); 
    if( !types.length ) { return }
    if( types[ 0 ] === 'Number' && types[ 1 ] === 'Number' ) {
        const diff = ( subtractor as number ) - ( subtrahend as number );
        return diff > 0 ? diff : 0;
    }
    return intArray.toMyInteger( doMath( 'subtract', subtractor, subtrahend ) );
}

function doMath(
    operator : Operator,
    operand1 : MyInteger,
    operand2 : MyInteger
) : Uint8Array {
    return typeof operand1 === 'number'
        ? typeof operand2 === 'number'
            ? intArray[ operator ](
                intArray.fromInteger( operand1 ),
                intArray.fromInteger( operand2 )
            )
            : intArray[ operator ](
                intArray.fromInteger( operand1 ),
                operand2
            )
        : typeof operand2 === 'number'
            ? intArray[ operator ](
                operand1,
                intArray.fromInteger( operand2 )
            )
            : intArray[ operator ]( operand1, operand2 );
}

function typeOperands(
    operand1? : MyInteger,
    operand2? : MyInteger
) {
    const type1 = getValidDelayTypeName( operand1 );
    if( type1 === 'Undefined' ) { return [] }
    const type2 = getValidDelayTypeName( operand2 );
    if( type2 === 'Undefined' ) { return [] }
    return [ type1, type2 ];
}
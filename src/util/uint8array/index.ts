import type { MyInteger } from '../../types';

const BASE = 10;

const MAX_INT_LENGTH = `${ Number.MAX_SAFE_INTEGER }`.length;

const STRING_PATTERN = /^[0-9]+\.?[0-9]*([eE]?[0-9]+)?$/;

const addDigit = ( adder : number, addend : number, carry : number = 0 ) => {
    let value = adder + addend + carry;
    return value < BASE 
        ? { value, carry: 0 }
        : { value: value - BASE, carry: 1 };
};

const trimLeadingZeros = ( value : Uint8Array ) : Uint8Array => {
    for( let i = 0, vLen = value.length; i < vLen; i++ ) {
        if( value[ i ] === 0 ) { continue }
        return i === 0 ? value : value.slice( i );
    }
    return new Uint8Array( 1 );
};

const convert = ( numStr : string ) : Uint8Array => {
    const intArr = [];
    for( const c of numStr ) { intArr.push( parseInt( c ) ) }
    return trimLeadingZeros( new Uint8Array( intArr ) );
};

export const add = ( adder : Uint8Array, addend: Uint8Array ) : Uint8Array => {
    adder = trimLeadingZeros( adder );
    addend = trimLeadingZeros( addend );
    let [ shorterLen, longerParam ] = adder.length < addend.length
        ? [ adder.length, addend ]
        : [ addend.length, adder ];
    let sum = { value: 0, carry: 0 };
    const tally : Array<number> = new Array( shorterLen );
    for(
        let i = 1, adderLen = adder.length, addendLen = addend.length;
        i <= shorterLen;
        i++
    ) {
        sum = addDigit(
            adder[ adderLen - i ],
            addend[ addendLen - i ],
            sum.carry
        );
        tally[ shorterLen - i ] = sum.value;
    }
    let remainingLen = longerParam.length - shorterLen;
    if( !sum.carry ) {
        tally.unshift( ...longerParam.slice( 0, remainingLen ) );
        return new Uint8Array( tally );
    }
    {
        const carriedOverSums : Array<number> = [];
        for( ; remainingLen--; ) {
            sum = addDigit( longerParam[ remainingLen ], sum.carry );
            carriedOverSums.push( sum.value );
            if( !sum.carry ) { break }
        }
        carriedOverSums.length && tally.unshift(
            ...carriedOverSums.reverse()
        );
    }
    if( sum.carry ) {
        tally.unshift( sum.carry );
    } else if( remainingLen ) {
        tally.unshift( ...longerParam.slice( 0, remainingLen ) )
    }
    return new Uint8Array( tally );
};

export const fromInteger = ( num : number ) : Uint8Array => fromString( `${ num }` );

export const fromString = ( str : string ) : Uint8Array => {
    if( !STRING_PATTERN.test( str ) ) {
        throw new SyntaxError( `Expecting a numeric string matching the RegExp pattern: ${ STRING_PATTERN.source } but found ${ str } instead.` );
    }
    let [ num, ...numParts ] = str.split( '.' );
    if( typeof numParts[ 0 ] === 'undefined' ) { return convert( num ) }
    let [ frac = '', exponent ] = numParts[ 0 ].split( 'e' );
    if( typeof exponent === 'undefined' ) { return convert( num ) }
    const exponentN : number = parseInt( exponent );
    if( isNaN( exponentN ) ) { return convert( num ) }
    return convert( `${ num }${ frac.slice( 0, exponentN ) }${ '0'.repeat( exponentN - frac.length ) }` );
};

export const subtract = (
    subtractor : Uint8Array,
    subtrahend: Uint8Array
) : Uint8Array => {
    subtractor = trimLeadingZeros( subtractor );
    subtrahend = trimLeadingZeros( subtrahend );
    if( subtractor.length < subtrahend.length || (
        subtractor[ 0 ] < subtrahend[ 0 ] 
    ) ) {
        return new Uint8Array( 1 );
    }
    const diff = subtractor.slice();
    for(
        let i = 1, subtractorLen = subtractor.length, subtrahendLen = subtrahend.length;
        i <= subtrahendLen;
        i++
    ) {
        const subtractorIndex = subtractorLen - i;
        if( subtractorIndex === 0 && diff[ 0 ] < subtrahend[ 0 ] ) {
            return new Uint8Array( 1 );
        }
        let digDiff = diff[ subtractorIndex ] - subtrahend[ subtrahendLen - i ];
        if( digDiff < 0 ) {
            digDiff += BASE;
            let isPositive = false;
            for( let offset = subtractorIndex; offset--; ) {
                if( diff[ offset ] > 0 ) {
                    diff[ offset ] -= 1;
                    isPositive = true;
                    break;
                }
                diff[ offset ] = 9;
            }
            if( !isPositive ) { return new Uint8Array( 1 ) }
        }
        diff[ subtractorIndex ] = digDiff;
    }
    return trimLeadingZeros( diff );
};

export const toMyInteger = ( uint8 : Uint8Array ) : MyInteger => {
    uint8 = trimLeadingZeros( uint8 );
    if( uint8.length > MAX_INT_LENGTH ) { return uint8 }
    const nStr : Array<string> = [];
    for( const u of uint8 ) { nStr.push( `${ u }` ) }
    const num  = parseInt( nStr.join( '' ) );
    return num <= Number.MAX_SAFE_INTEGER ? num : uint8;
};
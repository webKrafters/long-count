import type { Delay } from '../../index';

import { getTypeOfValidDelay, sanitizeDelay } from './index';

describe( 'Timer helpers', () => {
    describe( 'getTypeOfValidDelay(...)', () => {
        describe( 'on encountering valid types', () => {
            test.concurrent.each([
                [ 'Number', 'a valid number argument', 33 ],
                [ 'String', 'a valid string argument', 'ANY TEST STRING' ],
                [ 'BigInt', 'a valid big integer argument', BigInt( 254 ) ],
                [ 'Uint8Array', 'a valid uint8 array argument', new Uint8Array() ],
                [ 'Undefined', 'an undefined argument', undefined ],
                [ 'Iterable', 'a valid iterable argument e.g. an array', [] ],
                [ 'Iterable', 'a valid iterable argument e.g. a set', new Set() ],
                [ 'Iterable', 'a valid iterable argument e.g. a map', new Map() ]
            ])( "returns '%s' for %s", async ( typeName, typeLabel, arg ) => {
                expect( getTypeOfValidDelay( arg as Delay ) ).toEqual( typeName );
            } );
        } );
        describe( 'on encountering invalid types', () => {
            test.concurrent.each([
                [ 'null', null ],
                [ 'boolean', true ],
                [ 'symbol', Symbol() ],
                [ 'an object', {} ],
                [ 'iterable-like types like weak sets', new WeakSet() ],
                [ 'iterable-like types like weak map', new WeakMap() ],
                [ 'string-like types like regular expressions', /any thing/ ]
            ])( "returns 'Invalid' for e.g. %s", async ( typeLabel, arg ) => {
                expect( getTypeOfValidDelay( arg as Delay ) ).toEqual( 'Invalid' );
            } );
        } );
    } );
    describe( 'sanitizeDelay(...)', () => {
        const INT = 42375106;
        const INT_STR = `${ INT }`;
        const INT_STR_ARRAY = INT_STR.split( '' );
        const INT_ARRAY = INT_STR_ARRAY.map( s => parseInt( s ) );
        const XL_INT_STR = `${ INT_STR }20424345154`;
        const XL_INT_STR_ARRAY = XL_INT_STR.split( '' );
        const XL_INT_ARRAY = XL_INT_STR_ARRAY.map( s => parseInt( s ) );
        const XL_UINT8_ARRAY = new Uint8Array( XL_INT_ARRAY );
        const getInvalidMatcherProvider = ( expectedErrorMessage, expectedErrorType = TypeError ) => value => () => {
            let error;
            try { sanitizeDelay( value as unknown as Delay ) } catch( e ) { error = e }
            expect( error.constructor ).toEqual( expectedErrorType );
            expect( error.message ).toEqual( expectedErrorMessage );
        };
        describe( 'on encountering valid delay values', () => {
            test.concurrent.each([
                [ undefined, undefined ],
                [ 33, 33 ],
                [ 5, 5.234 ],
                [ INT, BigInt( INT ) ],
                [ INT, BigInt( INT_STR ) ],
                [ XL_UINT8_ARRAY, BigInt( XL_INT_STR ) ],
                [ INT, `${ INT }` ],
                [ 50000, '5e4' ],
                [ 5488942572, '5488942.572787654e3' ],
                [
                    new Uint8Array([ 5, 4, 8, 8, 9, 4, 2, 5, 7, 2, 7, 8, 7, 6, 5, 4, 0, 0, 0, 0 ]),
                    '5488942572.787654e10'
                ],
                [ XL_UINT8_ARRAY, XL_INT_STR ],
                [ INT, INT_ARRAY ],
                [ XL_UINT8_ARRAY, XL_INT_ARRAY ],
                /* Reminder: Sets remove duplicates shrinking long int array to 10 digits at most. */
                [ INT, new Set( INT_ARRAY ) ],
                [ INT, new Set( XL_INT_ARRAY ) ],
                [ INT, new Uint8Array( INT_ARRAY ) ],
                [ XL_UINT8_ARRAY, new Uint8Array( XL_INT_ARRAY ) ],
                /* Uint8Array constructor converts arguments to integers */
                // @ts-expect-error
                [ INT, new Uint8Array( INT_STR_ARRAY ) ],
                // @ts-expect-error
                [ XL_UINT8_ARRAY, new Uint8Array( XL_INT_STR_ARRAY ) ],
                [ 0, new Uint8Array( 1 ) ],
            ])( "returns %s for %s", async ( retVal, arg ) => {
                expect( sanitizeDelay( arg as Delay ) ).toEqual( retVal );
            } );
        } );
        describe( 'on encountering valid delay iterable type with the wrong value(s)', () => {
            const getMatcherFor = getInvalidMatcherProvider( 'Each element of an iterable `delay` only accepts an integer: 0 - 9.' );
            test.concurrent.each([
                [ 'integer iterables with negative value(s) e.g. arrays', [ 2, 7, -3, 0, 5, 1, 7 ] ],
                [ 'integer iterables with non-single digit value(s) e.g. arrays', [ 2, 7, 3, 0, 29, 1, 7 ] ],
                [ '"integer" iterables with numeric string value(s) e.g. arrays', [ 2, 7, 3, 0, 29, '1', 7 ] ],
                [ '"integer" iterables with non-integer numeric value(s) e.g. arrays', [ 2, 7, 3, 0.2, 5, 1, 7 ] ],
                [ 'any empty iterables e.g. array', [] ],
                [ 'any non-number iterables e.g. arrays', INT_STR_ARRAY ],
                [ 'any non-number iterables e.g. sets', new Set( INT_STR_ARRAY ) ],
                [ 'any empty iterables e.g. sets', new Set() ],
                [ 'any empty iterables e.g. TypedArrays', new Uint8Array() ],
                [ 'any non-number iterables e.g. maps', new Map([[ 'one', 1 ], [ 'zero', 0 ], [ 'two', 2 ], [ 'zero', 0 ] ]) ]
            ])( "throws for %s with invalid elements", async ( typeLabel, arg ) => getMatcherFor( arg )() );
        } );

        describe( 'on encountering invalid delay values', () => {
            const getMatcherFor = getInvalidMatcherProvider( 'Invalid delay argument type. Expected types: undefined | non-negative integer | non-negative integer string | non-negative BigInt | any iterable containing single digit non-negative integer per element.' );
            test.concurrent.each([
                [ 'null argument', null ],
                [ 'a boolean argument', true ],
                [ 'a symbol argument', Symbol() ],
                [ 'an object argument', {} ],
                [ 'negative integer string argument', '-5488942572' ],
                [ 'string-like types e.g. regular expressions', /any thing/ ],
            ])( "throws for %s", async ( typeLabel, arg ) => getMatcherFor( arg )() );
            const testIterableLike = ( typeLabel, col ) => test(
                `returns \`undefined\` for iterable-like types e.g. ${ typeLabel }`,
                getMatcherFor( col )
            );
            testIterableLike( 'WeakMap', new WeakMap([[ {}, 1 ], [ {}, 0 ], [ {}, 2 ], [ {}, 0 ] ]) );
            testIterableLike( 'WeakSset', new WeakSet([ {}, {}, {} ]) );
        } );
    } );
} );
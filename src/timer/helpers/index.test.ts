import type { Delay } from '../../types';

import { getValidDelayTypeName, sanitizeDelay } from './index';

describe( 'Timer helpers', () => {
    describe( 'getValidDelayTypeName(...)', () => {
        describe( 'on encountering valid types', () => {
            test.concurrent.each([
                [ 'Number', 'a valid number argument', 33 ],
                [ 'String', 'a valid string argument', 'ANY TEST STRING' ],
                [ 'BigInt', 'a valid big integer argument', BigInt( 254 ) ],
                [ 'Uint8Array', 'a valid uint8 array argument', new Uint8Array( 1 ) ],
                [ 'Undefined', 'an undefined argument', undefined ],
                [ 'Iterable', 'a valid iterable argument e.g. an array', [] ],
                [ 'Iterable', 'a valid iterable argument e.g. a set', new Set() ],
                [ 'Iterable', 'a valid iterable argument e.g. a map', new Map() ]
            ])( "returns '%s' for %s", async ( typeName, typeLabel, arg ) => {
                expect( getValidDelayTypeName( arg as Delay ) ).toEqual( typeName );
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
                expect( getValidDelayTypeName( arg as Delay ) ).toEqual( 'Invalid' );
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
        describe( 'on encountering valid delay values', () => {
            test.concurrent.each([
                [ 33, 33 ],
                [ 5, 5.234 ],
                [ INT, BigInt( INT ) ],
                [ INT, BigInt( INT_STR ) ],
                [ XL_UINT8_ARRAY, BigInt( XL_INT_STR ) ],
                [ INT, `${ INT }` ],
                [ XL_UINT8_ARRAY, XL_INT_STR ],
                [ INT,  INT_ARRAY ],
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
                [ XL_UINT8_ARRAY, new Uint8Array( XL_INT_STR_ARRAY ) ]
            ])( "returns %s for %s", async ( retVal, arg ) => {
                expect( sanitizeDelay( arg as Delay ) ).toEqual( retVal );
            } );
        } );
        describe( 'on encountering invalid delay values', () => {
            const getMatcherFor = value => () => expect( sanitizeDelay( value as unknown as Delay ) ).toBeUndefined();
            test.concurrent.each([
                [ 'undefined argument', undefined ],
                [ 'null argument', null ],
                [ 'a boolean argument', true ],
                [ 'a symbol argument', Symbol() ],
                [ 'an object argument', {} ],
                [ 'any non-number iterables e.g. arrays', INT_STR_ARRAY ],
                [ 'any non-number iterables e.g. sets', new Set( INT_STR_ARRAY ) ],
                [ 'any non-number iterables e.g. maps', new Map([[ 'one', 1 ], [ 'zero', 0 ], [ 'two', 2 ], [ 'zero', 0 ] ]) ],
                [ 'string-like types e.g. regular expressions', /any thing/ ],
            ])( "returns `undefined` for %s", async ( typeLabel, arg ) => getMatcherFor( arg )() );
            const testIterableLike = ( typeLabel, col ) => test(
                `returns \`undefined\` for iterable-like types e.g. ${ typeLabel }`,
                getMatcherFor( col )
            );
            testIterableLike( 'WeakMap', new WeakMap([[ {}, 1 ], [ {}, 0 ], [ {}, 2 ], [ {}, 0 ] ]) );
            testIterableLike( 'WeakSset', new WeakSet([ {}, {}, {} ]) );
        } );
    } );
} );
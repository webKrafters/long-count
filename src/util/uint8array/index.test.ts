import {
    add,
    fromScalar,
    subtract,
    toMyInteger
} from './index';

describe( 'uint8array utilities', () => {
    describe( 'add(...)', () => {
        test.concurrent.each([
            [
                1,
                new Uint8Array([ 0, 0, 0, 0, 0, 0, 0, 4, 3, 3, 5, 2 ]),
                new Uint8Array([                      6, 0, 0, 0, 0 ]),
                new Uint8Array([                   1, 0, 3, 3, 5, 2 ])
            ],
            [
                2,
                new Uint8Array([ 1, 0, 0, 4, 3, 3, 5, 2, 0, 1 ]),
                new Uint8Array([                6, 7, 9, 4, 9 ]),
                new Uint8Array([ 1, 0, 0, 4, 4, 0, 3, 1, 5, 0 ])
            ],
            [
                3,
                new Uint8Array([    4, 3, 3, 5, 2 ]),
                new Uint8Array([ 7, 6, 0, 0, 0, 0 ]),
                new Uint8Array([ 8, 0, 3, 3, 5, 2 ])
            ],
            [
                4,
                new Uint8Array([       4, 3, 3, 5, 2 ]),
                new Uint8Array([    9, 6, 0, 0, 0, 0 ]),
                new Uint8Array([ 1, 0, 0, 3, 3, 5, 2 ])
            ],
            [ 5,  new Uint8Array(), new Uint8Array(), new Uint8Array( 1 ) ],
            [ 6,  new Uint8Array( [] ), new Uint8Array( [] ), new Uint8Array( 1 ) ],
            [ 7,  new Uint8Array( 1 ), new Uint8Array( 1 ), new Uint8Array( 1 ) ],
        ])( 'test #%s', async ( index, adder, addend, expected ) => {
            expect( add( adder, addend ) ).toEqual( expected )
        } );
    } );
    describe( 'fromScalar(...)', () => {
        test.concurrent.each([
            [ 1, 43352, new Uint8Array([ 4, 3, 3, 5, 2 ]) ],
            [ 2, '43352', new Uint8Array([ 4, 3, 3, 5, 2 ]) ],
            [ 3, 6e4, new Uint8Array([ 6, 0, 0, 0, 0 ]) ],
            [ 4, '6e4', new Uint8Array([ 6, 0, 0, 0, 0 ]) ],
            [ 5, 103352, new Uint8Array([ 1, 0, 3, 3, 5, 2 ]) ],
            [ 6, '103352', new Uint8Array([ 1, 0, 3, 3, 5, 2 ]) ],
            [ 7, 1004335201, new Uint8Array([ 1, 0, 0, 4, 3, 3, 5, 2, 0, 1 ]) ],
            [ 8, '1004335201', new Uint8Array([ 1, 0, 0, 4, 3, 3, 5, 2, 0, 1 ]) ],
            [ 9, 67949, new Uint8Array([ 6, 7, 9, 4, 9 ]) ],
            [ 10, '67949', new Uint8Array([ 6, 7, 9, 4, 9 ]) ],
            [ 11, 76e4, new Uint8Array([ 7, 6, 0, 0, 0, 0 ]) ],
            [ 12, '76e4', new Uint8Array([ 7, 6, 0, 0, 0, 0 ]) ],
            [ 13, 803352, new Uint8Array([ 8, 0, 3, 3, 5, 2 ]) ],
            [ 14, '803352', new Uint8Array([ 8, 0, 3, 3, 5, 2 ]) ],
            [ 15, 0, new Uint8Array( 1 ) ],
            [ 16, '0', new Uint8Array( 1 ) ],
            [ 17, undefined, new Uint8Array() ],
            [ 18, 'undefined', new Uint8Array() ],
            [ 19, null, new Uint8Array() ],
            [ 20, 'null', new Uint8Array() ]
        ])( 'test #%s', async ( index, value, expected ) => {
            expect( fromScalar( value ) ).toEqual( expected )
        } );
        test.concurrent.each([
            [ 'throws SyntaxError on negative number values', -1 ],
            [ 'throws SyntaxError on negative numeric values', '-1' ],
            [ 'throws SyntaxError on non-numeric string values', 'A' ]
        ])( '%s', async ( label, value ) => {
            expect(() => fromScalar( value )).toThrow( SyntaxError );
        } );
    } );
    describe( 'subtract(...)', () => {
        test.concurrent.each([
            [
                1,
                new Uint8Array([ 0, 0, 0, 0, 0, 0, 0, 4, 3, 3, 5, 2 ]),
                new Uint8Array([                      6, 0, 0, 0, 0 ]),
                new Uint8Array([                                  0 ])
            ],
            [
                2,
                new Uint8Array([ 1, 0, 0, 4, 3, 3, 5, 2, 0, 1 ]),
                new Uint8Array([                6, 7, 9, 4, 9 ]),
                new Uint8Array([ 1, 0, 0, 4, 2, 6, 7, 2, 5, 2 ])
            ],
            [
                3,
                new Uint8Array([ 1, 0, 4, 3, 3, 5, 2, 0, 1 ]),
                new Uint8Array([ 1, 1, 0, 2, 6, 7, 9, 4, 9 ]),
                new Uint8Array([                         0 ])
            ],
            [
                4,
                new Uint8Array([    4, 3, 3, 5, 2 ]),
                new Uint8Array([ 7, 6, 0, 0, 0, 0 ]),
                new Uint8Array([                0 ])
            ],
            [
                5,
                new Uint8Array([ 9, 0, 0, 0, 6, 0, 0, 0, 0 ]),
                new Uint8Array([             9, 3, 3, 5, 2 ]),
                new Uint8Array([ 8, 9, 9, 9, 6, 6, 6, 4, 8 ])
            ],
            [ 6,  new Uint8Array(), new Uint8Array(), new Uint8Array( 1 ) ],
            [ 7,  new Uint8Array( [] ), new Uint8Array( [] ), new Uint8Array( 1 ) ],
            [ 8,  new Uint8Array( 1 ), new Uint8Array( 1 ), new Uint8Array( 1 ) ],
        ])( 'test #%s', async ( index, subtractor, subtrahend, expected ) => {
            expect( subtract( subtractor, subtrahend ) ).toEqual( expected )
        } );
    } );
    describe( 'toMyInteger(...)', () => {
        test.concurrent.each([
            [ 1, 43352, new Uint8Array([ 4, 3, 3, 5, 2 ]) ],
            [ 2, 6e4, new Uint8Array([ 6, 0, 0, 0, 0 ]) ],
            [ 3, 103352, new Uint8Array([ 1, 0, 3, 3, 5, 2 ]) ],
            [ 4, 1004335201, new Uint8Array([ 1, 0, 0, 4, 3, 3, 5, 2, 0, 1 ]) ],
            [ 5, 67949, new Uint8Array([ 6, 7, 9, 4, 9 ]) ],
            [ 6, 76e4, new Uint8Array([ 7, 6, 0, 0, 0, 0 ]) ],
            [ 7, 803352, new Uint8Array([ 8, 0, 3, 3, 5, 2 ]) ],
            [ 8, 0, new Uint8Array( 1 ) ],
            [ 9, undefined, new Uint8Array() ]
        ])( 'test #%s', async ( index, expected, value ) => {
            expect( toMyInteger( value ) ).toEqual( expected )
        } );
        test( 'returns untouched where value exceeds MAX_SAFE_INTEGER range', () => {
            const value = new Uint8Array([
                2, 2, 8, 7, 4, 6, 6, 6, 2, 0, 7, 5, 3, 8, 1, 9, 0, 4, 6, 2, 9, 4, 8
            ]);
            expect( value ).toBe( value );
        } );
        test.concurrent.each([
            [ 'throws SyntaxError on negative number values', -1 ],
            [ 'throws SyntaxError on negative numeric values', '-1' ],
            [ 'throws SyntaxError on non-numeric string values', 'A' ]
        ])( '%s', async ( label, value ) => {
            expect(() => fromScalar( value )).toThrow( SyntaxError );
        } );
    } );
} );
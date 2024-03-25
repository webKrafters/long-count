import { getTypeOfMyInteger, getTypeOf, noop } from './index';

describe( 'Util', () => {
    describe( 'getTypeOf(...)', () => {
        test.concurrent.each([
            [ 'Boolean', 'bool', true ],
            [ 'Function', 'function', () => {} ],
            [ 'Number', 'number', 7 ],
            [ 'String', 'string', 'Just testing' ],
            [ 'Array', 'array', [] ],
            [ 'Uint8Array', 'uint 8 array', new Uint8Array() ],
            [ 'Object', 'object', {} ],
            [ 'RegExp', 'regular expressions', /b/ ],
            [ 'WeakMap', 'weak map', new WeakMap() ],
            [ 'Set', 'set', new Set() ]
        ])(
            `returns type name e.g. %s for %s value`,
            async ( typeName, typeLabel, value ) => {
                expect( getTypeOf( value ) ).toEqual( typeName );
            }
        );
    } );
    describe( 'getTypeOfMyInteger(...)', () => {
        test.concurrent.each([
            [ 'Invalid', 'bool', true ],
            [ 'Invalid', 'function', () => {} ],
            [ 'Number', 'number', 7 ],
            [ 'Invalid', 'string', 'Just testing' ],
            [ 'Invalid', 'array', [] ],
            [ 'Uint8Array', 'uint 8 array', new Uint8Array() ],
            [ 'Invalid', 'object', {} ],
            [ 'Invalid', 'regular expressions', /b/ ],
            [ 'Invalid', 'weak map', new WeakMap() ],
            [ 'Invalid', 'set', new Set() ]
        ])(
            `returns type name e.g. %s for %s value`,
            async ( typeName, typeLabel, value ) => {
                expect( getTypeOfMyInteger( value ) ).toEqual( typeName );
            }
        );
    } );
    describe( 'noop(...)', () => {
        test( 'is a empty void function', () => {
            expect( noop( 1, 3 ) ).toBeUndefined();
        } );
    } );
} );
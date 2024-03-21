import { getTypeName, noop } from './index';

describe( 'Util', () => {
    describe( 'getTypeName(...)', () => {
        test.concurrent.each([
            [ 'Boolean', 'bool', true ],
            [ 'Function', 'function', () => {} ],
            [ 'Number', 'number', 7 ],
            [ 'String', 'string', 'Just testing' ],
            [ 'Array', 'array', [] ],
            [ 'Object', 'object', {} ],
            [ 'RegExp', 'regular expressions', /b/ ],
            [ 'WeakMap', 'weak map', new WeakMap() ],
            [ 'Set', 'set', new Set() ]
        ])(
            `returns type name e.g. %s for %s value`,
            ( typeName, typeLabel, value ) => {
                expect( getTypeName( value ) ).toEqual( typeName );
            }
        );
    } );
    describe( 'noop(...)', () => {
        test( 'is a empty void function', () => {
            expect( noop( 1, 3 ) ).toBeUndefined();
        } );
    } );
} );
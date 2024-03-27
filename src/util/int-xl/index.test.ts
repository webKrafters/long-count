import { add, deps, isGreaterThan, subtract } from './index';

describe( 'intXl module', () => {
    let fromScalarSpy, toMyIntegerSpy, uint8AddSpy, uint8SubtractSpy;
    beforeAll(() => {
        fromScalarSpy = jest.spyOn( deps.intArray, 'fromScalar' );
        toMyIntegerSpy = jest.spyOn( deps.intArray, 'toMyInteger' );
        uint8AddSpy = jest.spyOn( deps.intArray, 'add' );
        uint8SubtractSpy = jest.spyOn( deps.intArray, 'subtract' );
    });
    beforeEach(() => jest.clearAllMocks());
    afterAll(() => jest.restoreAllMocks());
    describe( 'add operation', () => {
        describe( 'acceptable input', () => {
            test( 'all sums are positive or zero', () => {
                const sum = add( 11, -33 );
                expect( sum ).not.toBe( 11 + ( -33 ) );
                expect( sum ).toBe( 0 );
            } );
            describe( 'encoutering `MyInteger` types', () => {
                describe( 'containing 2 integers', () => {
                    test( 'applies basic "+" operation when sum not exceeding MAX_SAFE_INTEGER', () => {
                        const sum = add( 8, 8 );
                        expect( sum ).toBe( 16 );
                        expect( fromScalarSpy ).not.toHaveBeenCalled();
                        expect( toMyIntegerSpy ).not.toHaveBeenCalled();
                        expect( uint8AddSpy ).not.toHaveBeenCalled();
                        expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                    } );
                    test( 'applies the uint8 `add` operation for sum exceeding MAX_SAFE_INTEGER', () => {
                        const adder = Number.MAX_SAFE_INTEGER - 5e9
                        const addend = 1e10;
                        add( adder, addend );

                        // converts both integers to Uint8arrays for a long addition
                        expect( fromScalarSpy ).toHaveBeenCalledTimes( 2 );
                        expect( fromScalarSpy.mock.calls[ 0 ] ).toEqual([ adder ]);
                        expect( fromScalarSpy.mock.calls[ 1 ] ).toEqual([ addend ]);

                        // does not attempts to convert sum to integer as it can never 
                        // fall within the MAX_SAFE_INTEGER range
                        expect( toMyIntegerSpy ).not.toHaveBeenCalled();

                        expect( uint8AddSpy ).toHaveBeenCalledTimes( 1 );
                        
                        expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                    } );
                } );
                describe( 'containing at least one Uint8Arrays', () => {
                    test( 'applies basic `+` operation when any is a Uint8Array and sum not exceeding MAX_SAFE_INTEGER', () => {
                        const adder = 504;
                        const addend = new Uint8Array([ 1 ]);
                        expect( add( adder, addend ) ).toBe( 505 );

                        // no need to convert adder to a Uint8array for a long addition
                        expect( fromScalarSpy ).not.toHaveBeenCalled();

                        // attempts to convert addend to integer
                        expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 1 );
                        expect( toMyIntegerSpy ).toHaveBeenCalledWith( addend );

                        expect( uint8AddSpy ).not.toHaveBeenCalled();
                        
                        expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                    } );
                    test( 'applies basic `+` operation when both are Uint8Arrays with a sum within the MAX_SAFE_INTEGER', () => {
                        const adder = new Uint8Array([ 22 ]);
                        const addend = new Uint8Array([ 1 ]);
                        expect( add( adder, addend ) ).toBe( 23 );

                        // no need for an integer to Uint8Array conversion
                        expect( fromScalarSpy ).not.toHaveBeenCalled();

                        // attempts to convert both operands to integer if within the MAX_SAFE_INTEGER range
                        expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 2 );
                        expect( toMyIntegerSpy.mock.calls[ 0 ][ 0 ] ).toEqual( adder );
                        expect( toMyIntegerSpy.mock.calls[ 1 ][ 0 ] ).toEqual( addend );

                        expect( uint8AddSpy ).not.toHaveBeenCalled();
                        
                        expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                    } );
                    test( 'the uint8 `add` operation for any Uint8Array operand forming a digits of integer exceeding MAX_SAFE_INTEGER', () => {
                        const adder = 1023;
                        const addend = new Uint8Array([
                            3, 0, 0, 0, 0, 2, 1, 9, 6, 7, 1, 3, 8, 1, 9, 0, 3, 2, 4, 7, 5, 8
                        ]);
                        const sum = new Uint8Array([
                            3, 0, 0, 0, 0, 2, 1, 9, 6, 7, 1, 3, 8, 1, 9, 0, 3, 2, 5, 7, 8, 1
                        ]);
                        expect( add( adder, addend ) ).toEqual( sum );

                        // to convert adder to a Uint8array for a long addition
                        expect( fromScalarSpy ).toHaveBeenCalledTimes( 1 );
                        expect( fromScalarSpy ).toHaveBeenCalledWith( adder );

                        // attempts to convert addend to integer - in case if within the MAX_SAFE_INTEGER range
                        expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 2 );
                        expect( toMyIntegerSpy.mock.calls[ 0 ][ 0 ] ).toEqual( addend );
                        expect( toMyIntegerSpy.mock.calls[ 1 ][ 0 ] ).toEqual( sum );

                        expect( uint8AddSpy ).toHaveBeenCalledTimes( 1 );
                        expect( uint8AddSpy ).toHaveBeenCalledWith( new Uint8Array([ 1, 0, 2, 3 ]), addend );
                        
                        expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                    } );
                } );
            } );
            describe( 'encoutering non `My Integer` types', () => {
                test( 'returns `undefined`', () => {
                    // @ts-expect-error
                    expect( add( 20, '55' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( 3, false ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( new Uint8Array(), new Uint32Array( 3 ) ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( new Uint8Array(), '55' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( [], [] ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( '1', '2' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( add( true, false ) ).toBeUndefined();
                } );
            } );
        } );
    } );
    describe( 'isGreaterThan()', () => {
        const uInt8Array = new Uint8Array([ 3, 7, 3, 9, 9, ...( '9'.repeat( 28 ).split( '' ).map( v => +v ) ) ]);
        test( 'compares first operand to the second', () => {
            expect( isGreaterThan( 2126006663046353, 2124288660690935 ) ).toBe( true )
            expect( isGreaterThan( 2124288660690935, 2126006663046353 ) ).toBe( false )
            expect( isGreaterThan( 2124288660690935, 2124288660690935) ).toBe( false )
        } );
        test( 'also compares large integers in whose digits are loaded in Uint8Array', () => {
            const xlInt1 = new Uint8Array([ 3, 7, 4, 0, 1, ...( '0'.repeat( 28 ).split( '' ).map( v => +v ) ) ]);
            const xlInt2 = uInt8Array;
            const int = 8801;
            expect( isGreaterThan( xlInt1, int ) ).toBe( true );
            expect( isGreaterThan( int, xlInt1 ) ).toBe( false );
            expect( isGreaterThan( xlInt1, xlInt1 ) ).toBe( false );
            expect( isGreaterThan( xlInt1, xlInt2 ) ).toBe( true );
            expect( isGreaterThan( xlInt2, xlInt1 ) ).toBe( false );
        } );
        describe( 'only for use with numbers and Uint8Array containing single integer values', () => {
            test( 'unexpected behavior with big integers - use single digit integer Uint8Arrays', () => {
                // @ts-expect-error
                expect( isGreaterThan( 90, 22n ) ).toBe( false );
                expect( isGreaterThan( 90, 22 ) ).toBe( true );
                // @ts-expect-error
                expect( isGreaterThan( BigInt( uInt8Array.join( '' ) ), 33 ) ).toBe( false );
                expect( isGreaterThan( uInt8Array, 33 ) ).toBe( true );

            } );
        } );
    } );
    describe( 'subtract operation', () => {
        describe( 'acceptable input', () => {
            test( 'all differences are positive or zero', () => {
                const diff = subtract( 11, 33 );
                expect( diff ).not.toBe( 11 - 33 );
                expect( diff ).toBe( 0 );
            } );
            describe( 'encoutering `MyInteger` types', () => {
                test( 'applies basic "-" operation to 2 integers', () => {
                    const diff = subtract( 9, 7 );
                    expect( diff ).toBe( 2 );
                    expect( fromScalarSpy ).not.toHaveBeenCalled();
                    expect( toMyIntegerSpy ).not.toHaveBeenCalled();
                    expect( uint8AddSpy ).not.toHaveBeenCalled();
                    expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                } );
                describe( 'containing at least one Uint8Array', () => {
                    describe( 'where only one operand is a Uint8Array', () => {
                        test( 'applies basic "-" operation when the Uint8Array operand can be rewritten as a safe integer', () => {
                            const subtractor = 138190;
                            const subtrahend = new Uint8Array([ 3, 8, 1, 9, 0 ]);
                            expect( subtract( subtractor, subtrahend ) ).toBe( 1e5 );

                           // no need to converts the integer - using simple subtraction
                            expect( fromScalarSpy ).not.toHaveBeenCalled();
    
                            // converts subtrahend Uiint8Array to integer
                            expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 1 );
                            expect( toMyIntegerSpy ).toHaveBeenCalledWith( subtrahend);
    
                            expect( uint8AddSpy ).not.toHaveBeenCalled();
                            
                            expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                        } );
                        test( 'applies uint 8 "subtract" operation for integer subtrahend and a Uint8Array subtractor which cannot be rewritten as a safe integer', () => {
                            const subtractor = new Uint8Array([
                                3, 0, 0, 0, 0, 2, 1, 9, 6, 7, 1, 3, 8, 1, 9, 0, 4, 6, 2, 9, 4, 8
                            ]);
                            const subtrahend = 138190;
                            expect( subtract( subtractor, subtrahend ) ).toEqual( new Uint8Array([
                                3, 0, 0, 0, 0, 2, 1, 9, 6, 7, 1, 3, 8, 1, 9, 0, 3, 2, 4, 7, 5, 8
                            ]) );

                            // rewrites subtrahend to Uint8Array for the long subtraction
                            expect( fromScalarSpy ).toHaveBeenCalledTimes( 1 );
                            expect( fromScalarSpy ).toHaveBeenCalledWith( subtrahend );
    
                            // attempts to convert Uiint8Array substractor and diffs to integer
                            expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 2 );
                            expect( toMyIntegerSpy.mock.calls[ 0 ][ 0 ] ).toEqual( subtractor );
                            expect( toMyIntegerSpy.mock.calls[ 1 ][ 0 ] ).toEqual( expect.anything() );
    
                            expect( uint8AddSpy ).not.toHaveBeenCalled();
                            
                            expect( uint8SubtractSpy ).toHaveBeenCalledTimes( 1 );
                            expect( uint8SubtractSpy ).toHaveBeenCalledWith(
                                subtractor, 
                                new Uint8Array([ 1, 3, 8, 1, 9, 0 ]) // subtrahend integer digits arranged into a Uint8Array
                            );
                        } );
                        test( 'returns 0 for integer subtractor and a Uint8Array subtrahend which cannot be rewritten as a safe integer', () => {
                            const subtractor = 138190;
                            const subtrahend = new Uint8Array([
                                2, 2, 8, 7, 4, 6, 6, 6, 2, 0, 7, 5, 3, 8, 1, 9, 0, 4, 6, 2, 9, 4, 8
                            ]);
                            expect( subtract( subtractor, subtrahend ) ).toBe( 0 );

                            // no need to convert the integer - using simple subtraction
                            expect( fromScalarSpy ).not.toHaveBeenCalled();

                            // converts subtrahend Uiint8Array to integer
                            expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 1 );
                            expect( toMyIntegerSpy ).toHaveBeenCalledWith( subtrahend);

                            expect( uint8AddSpy ).not.toHaveBeenCalled();
                            
                            expect( uint8SubtractSpy ).not.toHaveBeenCalled();
                        } );
                    } );
                    describe( 'where both operands are Uint8Arrays', () => {
                        test( 'applies uint8 `subtract` operation when both are Uint8Arrays which cannot be rewritten as safe integer', () => {
                            const subtractor = new Uint8Array([ 
                                2, 2, 8, 7, 4, 6, 6, 6, 2, 0, 7, 5, 3, 8, 1, 9, 0, 4, 6, 2, 9, 4, 8 
                            ]);
                            const subtrahend = new Uint8Array([ 
                                2, 2, 6, 8, 9, 0, 1, 3, 2, 7, 5, 9, 2, 8, 4, 9, 0, 9, 7, 3, 1, 1, 0 
                            ]);
                            expect( subtract( subtractor, subtrahend ) ).toEqual( new Uint8Array([
                                      1, 8, 5, 6, 5, 2, 9, 3, 1, 6, 0, 9, 6, 9, 9, 4, 8, 9, 8, 3, 8
                            ]) );
    
                            // no need for an integer to Uint8Array conversion
                            expect( fromScalarSpy ).not.toHaveBeenCalled();
    
                            // attempts to convert subtractor, subtrahend and diff to integer if within the MAX_SAFE_INTEGER range
                            expect( toMyIntegerSpy ).toHaveBeenCalledTimes( 3 );
                            expect( toMyIntegerSpy.mock.calls[ 0 ][ 0 ] ).toEqual( subtractor );
                            expect( toMyIntegerSpy.mock.calls[ 1 ][ 0 ] ).toEqual( subtrahend );
                            expect( toMyIntegerSpy.mock.calls[ 2 ][ 0 ] ).toEqual( expect.anything() );
    
                            expect( uint8AddSpy ).not.toHaveBeenCalled();

                            expect( uint8SubtractSpy ).toHaveBeenCalledTimes( 1 );
                            expect( uint8SubtractSpy ).toHaveBeenCalledWith( subtractor, subtrahend );
                        } );
                    } );
                } );
            } );
            describe( 'encoutering non `My Integer` types', () => {
                test( 'returns `undefined`', () => {
                    // @ts-expect-error
                    expect( subtract( 20, '55' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( 3, false ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( new Uint8Array(), new Uint32Array( 3 ) ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( new Uint8Array(), '55' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( [], [] ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( '1', '2' ) ).toBeUndefined();
                    // @ts-expect-error
                    expect( subtract( true, false ) ).toBeUndefined();
                } );
            } );
        } );
    } );
} );
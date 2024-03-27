type IntRange = { max : number, min : number }

import type { Options } from '../types';

import type { IEventMock } from '../../test-artifacts/global-events';

import { MAX_SET_TIMEOUT_DELAY } from '../constants';

import { setupMocks as getEventMocks } from '../../test-artifacts/global-events';

import Timer from './index';

let warnSpy;
let eMocks : IEventMock;
beforeAll(() => {
    eMocks = getEventMocks();
    warnSpy = jest
        .spyOn( global.console, 'warn' )
        .mockReturnValue( undefined );
});
afterAll(() => {
    eMocks.mockRestore();
    warnSpy.mockRestore();
});

const interceptGroupTestError = ( e : Error ) => {
    if( e.constructor.name === 'JestAssertionError' ) {
        e.message += '\n\nPLEASE RUN IT INDIVIDUALLY TO VERIFY.';
        e.message += '\nUsing the following CLI command:'
        e.message += '\nnpm run test -- ./src/timer/index.test.ts -t "<PLACE TEST CASE NAME HERE>"';
    }
    return e;
};

const getTimeoutSpy = () => {
    const origSetTimeout = global.setTimeout;
    return jest.spyOn( global, 'setTimeout' ).mockImplementation(
        ( fn, delay, ...args ) => origSetTimeout( fn, 0, ...args )
    );       
}

describe( 'Timer - RT testing', () => {
    describe( 'behavior at beyond the platform max setTimeout delay', () => {
        const runTest = ( label : string, delay : any, expectedNumRefreshes : number /* must be sufficient to bring time remaining at early termination within the MAX_SAFE_INTEGER range */, timeRemainingRange? : IntRange ) => {
            test( label, () => new Promise(( resolve, reject ) => {
                const handlerMock = jest.fn();
                const timeoutSpy = getTimeoutSpy();
                const timer = new Timer( handlerMock, delay );
                timer.addEventListener( 'cycleEnding', ({ currentCycle, isFinal } : {
                    currentCycle : number,
                    isFinal : boolean
                }) => {
                    if( isFinal ) {
                        try {
                            expect( handlerMock ).toHaveBeenCalledTimes( 1 );
                            expect( timeoutSpy ).toHaveBeenCalledTimes( expectedNumRefreshes );
                            expect( currentCycle ).toBe( expectedNumRefreshes );
                            resolve( true );
                        } catch( e ) {
                            reject( interceptGroupTestError( e ) )
                        } finally { timeoutSpy.mockRestore() }
                    }
                    if( expectedNumRefreshes !== currentCycle ) { return }
                    try {
                        expect( timeRemainingRange ).toBeDefined(); // otherwise there is a mismatch between the expected #cycles needed to complete the long count request and the actual #cycles received
                        expect( handlerMock ).not.toHaveBeenCalled();
                        expect( timeoutSpy ).toHaveBeenCalledTimes( expectedNumRefreshes );
                        const actualTimeRemaining = timer.currentWaitTime as number;
                        expect( actualTimeRemaining ).toBeGreaterThanOrEqual( timeRemainingRange.min );
                        expect( actualTimeRemaining ).toBeLessThan( timeRemainingRange.max );
                        resolve( true );
                    } catch( e ) {
                        reject( interceptGroupTestError( e ) )
                    } finally {
                        timer.exit();
                        timeoutSpy.mockRestore();
                    }
                } );
            } ) );
        }
        runTest(
            'accepts any positive integer up to MAX_SAFE_INTEGER',
            3.156e10, /* 360 DAYS IN MS (greater than the jest 2,147,483,647ms global timeout limit  ) */
            Math.ceil( 3.156e10 / MAX_SET_TIMEOUT_DELAY )
        );
        runTest(
            'accepts any positive big integer',
            BigInt( 3.156e10 ), /* 360 DAYS IN MS (greater than the jest 2,147,483,647ms global timeout limit  ) */
            Math.ceil( 3.156e10 / MAX_SET_TIMEOUT_DELAY )
        );
        const xlIntTestArgs : [ number, IntRange ] = [ 2, {
            min: Math.max( 0, Number.MAX_SAFE_INTEGER - ( MAX_SET_TIMEOUT_DELAY + 1.5e9 ) ),
            max: Number.MAX_SAFE_INTEGER
        } ];
        runTest(
            'accepts any HUMONGOUS positive big integer surpassing MAX_SAFE_INTEGER - alpha testing',
            9007200754740991n, // (MAX_SAFE_INTEGER + 1.5e9)ms
            ...xlIntTestArgs
        );
        runTest(
            'accepts any HUMONGOUS positive integer string surpassing MAX_SAFE_INTEGER - alpha testing',
            '9007200754740991', // (MAX_SAFE_INTEGER + 1.5e9)ms
            ...xlIntTestArgs
        );
        runTest(
            'accepts any HUMONGOUS positive Uint8Array surpassing MAX_SAFE_INTEGER - alpha testing',
            new Uint8Array([ 9, 0, 0, 7, 2, 0, 0, 7, 5, 4, 7, 4, 0, 9, 9, 1 ]), // (MAX_SAFE_INTEGER + 1.5e9)ms
            ...xlIntTestArgs
        );
        runTest(
            'accepts any HUMONGOUS positive Uint32Array surpassing MAX_SAFE_INTEGER - alpha testing',
            new Uint32Array([ 9, 0, 0, 7, 2, 0, 0, 7, 5, 4, 7, 4, 0, 9, 9, 1 ]), // (MAX_SAFE_INTEGER + 1.5e9)ms
            ...xlIntTestArgs
        );
        runTest(
            'accepts any iterable e.g. an array containing elements of a HUMONGOUS positive integer surpassing MAX_SAFE_INTEGER - alpha testing',
            [ 9, 0, 0, 7, 2, 0, 0, 7, 5, 4, 7, 4, 0, 9, 9, 1 ], // (MAX_SAFE_INTEGER + 1.5e9)ms
            ...xlIntTestArgs
        );
        (() => {
            class UserIterable {
                #items : Array<number>;
                constructor( items : Array<number> = [] ) { this.#items = items }
                [ Symbol.iterator ]() { return this.#items.values() }
            }
            runTest(
                'accepts user defined iterable class containing elements of a HUMONGOUS positive integer surpassing MAX_SAFE_INTEGER - alpha testing',
                new UserIterable([ 9, 0, 0, 7, 2, 0, 0, 7, 5, 4, 7, 4, 0, 9, 9, 1 ]), // (MAX_SAFE_INTEGER + 1.5e9)ms
                ...xlIntTestArgs
            );
        })();
    } );
    describe( '`maxTimeoutDelay` constructor options property', () => {
        const getTestRunner = ( expectedNumTimeouts = 2, options : Options = {} ) => () => new Promise(
            ( resolve, reject ) => {
                const { maxTimeoutDelay = MAX_SET_TIMEOUT_DELAY } = options;
                const handlerMock = jest.fn();
                const setTimeoutSpy = getTimeoutSpy();
                const timer = new Timer( handlerMock, maxTimeoutDelay * expectedNumTimeouts, options );
                timer.addEventListener( 'cycleEnding', ({ currentCycle, isFinal } : {
                    currentCycle : number,
                    isFinal : boolean
                }) => {
                    if( !isFinal ) { return }
                    try {
                        expect( setTimeoutSpy ).toHaveBeenCalledTimes( expectedNumTimeouts );
                        expect( currentCycle ).toBe( expectedNumTimeouts );
                        expect( handlerMock ).toHaveBeenCalledTimes( 1 );
                        resolve( true );
                    } catch( e ) {
                        timer.exit();
                        reject( interceptGroupTestError( e ) )
                    } finally {
                        setTimeoutSpy.mockRestore();
                    }
                } );
            }
        )
        test( 'when unset, uses the default settimeout limit', getTestRunner() );
        test(
            'when set to value, uses that value instead',
            getTestRunner( 10, { maxTimeoutDelay: 1e4 } )
        );
    } );
} );
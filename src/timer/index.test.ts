type IntRange = { max : number, min : number }

import type { Options } from '../types';
                
import { EMPTY_OBJECT, MAX_SET_TIMEOUT_DELAY } from '../constants';

import TimerObservable from '../observable/index';

import Timer from './index';

import { setupMocks as getEventMocks } from '../../test-artifacts/global-events';

const noop = () => {};

jest.useFakeTimers();

describe( 'Timer', () => {
    test( 'is an observable timer', () => {
        expect( new Timer( noop ) ).toBeInstanceOf( TimerObservable );
    } );
    describe( 'delay', () => {
        test( 'is 0 by default', () => {
            const handlerMock = jest.fn();
            new Timer( handlerMock );
            expect( handlerMock ).not.toHaveBeenCalled();
            jest.advanceTimersByTime( 0 );
            expect( handlerMock ).toHaveBeenCalledTimes( 1 );
        } );
        test( 'executes after `delay` ms following instantiation', () => {
            const waitTimes = [ 900, 100 ];
            const handlerMock = jest.fn();
            new Timer( handlerMock, waitTimes[ 0 ] + waitTimes[ 1 ] );
            expect( handlerMock ).not.toHaveBeenCalled();
            jest.advanceTimersByTime( waitTimes[ 0 ] );
            expect( handlerMock ).not.toHaveBeenCalled();
            jest.advanceTimersByTime( waitTimes[ 1 ] );
            expect( handlerMock ).toHaveBeenCalledTimes( 1 );
        } );
        describe( 'constructor options object', () => {
            describe( '`immediate` property', () =>{
                test( 'when true, initially invokes the handler immediately following instantion', () => {
                    const handler = jest.fn();
                    const timeSegments = [ 800, 200 ]; // total = 1 second 
                    new Timer(
                        handler,
                        timeSegments[ 0 ] + timeSegments[ 1 ],
                        { immediate: true }
                    );
                    expect( handler ).toHaveBeenCalledTimes( 1 ); // handler invoked immediately
                    jest.advanceTimersByTime( timeSegments[ 0 ] );
                    expect( handler ).toHaveBeenCalledTimes( 1 );
                    jest.advanceTimersByTime( timeSegments[ 1 ] );
                    expect( handler ).toHaveBeenCalledTimes( 2 ); // handler invoked after 1 second
                } );
                test.each([
                    [ 'false', { immediate: false } ],
                    [ 'unset', {} ]
                ])( 'when %s, does not invokes the handler immediately following instantion', ( scenario, options ) => {
                    const handler = jest.fn();
                    const timeSegments = [ 800, 200 ]; // total = 1 second 
                    new Timer(
                        handler,
                        timeSegments[ 0 ] + timeSegments[ 1 ],
                        options
                    );
                    expect( handler ).not.toHaveBeenCalled(); // handler not invoked immediately
                    jest.advanceTimersByTime( timeSegments[ 0 ] );
                    expect( handler ).toHaveBeenCalledTimes( 0 );
                    jest.advanceTimersByTime( timeSegments[ 1 ] );
                    expect( handler ).toHaveBeenCalledTimes( 1 ); // handler invoked after 1 second
                } );
            } );
            describe( '`maxTimeoutDelay` property', () => {
                const getTestRunner = ( expectedNumTimeouts = 2, options : Options = {} ) => () => new Promise(
                    ( resolve, reject ) => {
                        jest.useRealTimers();
                        const { maxTimeoutDelay = MAX_SET_TIMEOUT_DELAY } = options;
                        const origSetTimeout = global.setTimeout;
                        const handler = jest.fn();
                        const setTimeoutSpy = jest.spyOn( global, 'setTimeout' ).mockImplementation(
                            ( fn, delay, ...args ) => origSetTimeout( fn, 0, ...args )
                        );
                        const timer = new Timer( handler, maxTimeoutDelay * expectedNumTimeouts, options );
                        timer.addEventListener( 'cycleEnding', ({ currentCycle, isFinal } : {
                            currentCycle : number,
                            isFinal : boolean
                        }) => {
                            if( !isFinal ) { return }
                            try {
                                expect( setTimeoutSpy ).toHaveBeenCalledTimes( expectedNumTimeouts );
                                expect( currentCycle ).toBe( expectedNumTimeouts );
                                expect( handler ).toHaveBeenCalledTimes( 1 );
                                resolve( true );
                            } catch( e ) {
                                reject( e )
                            } finally {
                                setTimeoutSpy.mockRestore();
                                jest.useFakeTimers();
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
        })
        describe( 'double trigger', () => {
            let calledImmediately, calledAfterDelay;
            const args = [ 1, {
                min: Math.max( 0, Number.MAX_SAFE_INTEGER - ( MAX_SET_TIMEOUT_DELAY + 1.5e9 ) ),
                max: Number.MAX_SAFE_INTEGER
            } ];
            beforeAll(() => {
                const DELAY = 1000;
                const handlerMock = jest.fn();
                new Timer( handlerMock, DELAY, { immediate: true } );
                calledImmediately = handlerMock.mock.calls.length === 1;
                handlerMock.mockClear();
                jest.advanceTimersByTime( DELAY );
                calledAfterDelay = handlerMock.mock.calls.length === 1;
            });
            test( 'is in full effect', () => {
                expect( calledImmediately && calledAfterDelay ).toBe( true );
            } );
            test( 'executes immediately following instantiation', () => {
                expect( calledImmediately ).toBe( true )
            } );
            test( 'executes after delay time reached', () => {
                expect( calledAfterDelay ).toBe( true );
            } );
        } );
        describe( 'values and ranges', () => {
            test( 'defaults to 0 for negative integer', () => {
                const DELAY = -1e5;
                const handlerMock = jest.fn();
                new Timer( handlerMock, DELAY );
                expect( handlerMock ).not.toHaveBeenCalled();
                jest.advanceTimersByTime( 0 );
                expect( handlerMock ).toHaveBeenCalledTimes( 1 );
            } );
            describe( 'behavior at beyond the platform max setTimeout delay', () => {
                let eventMocks, handlerMock, origSetTimeout, timeoutSpy;
                beforeAll(() => {
                    eventMocks = getEventMocks();
                    jest.useRealTimers();
                    handlerMock = jest.fn();
                    origSetTimeout = global.setTimeout;
                    timeoutSpy = jest
                        .spyOn( global, 'setTimeout' )
                        .mockImplementation(( fn, delay, ...args ) => origSetTimeout( fn, 0, ...args ));
                });
                beforeEach(() => {
                    eventMocks.mockClear();
                    handlerMock.mockClear();
                    timeoutSpy.mockClear();
                });
                afterAll(() => {
                    eventMocks.mockRestore();
                    jest.useFakeTimers();
                    timeoutSpy.mockRestore();
                });
                const interceptError = ( e : Error ) => {
                    if( e.constructor.name === 'JestAssertionError' ) {
                        e.message += '\n\nPLEASE RUN IT INDIVIDUALLY TO VERIFY.';
                        e.message += '\nUsing the following CLI command:'
                        e.message += '\nnpm run test -- ./src/timer/index.test.ts -t "<PLACE TEST CASE NAME HERE>"';
                    }
                    return e;
                };
                const runTest = ( label : string, delay : any, expectedNumRefreshes : number /* must be sufficient to bring time remaining at early termination within the MAX_SAFE_INTEGER range */, timeRemainingRange? : IntRange ) => {
                    test( label, () => new Promise(( resolve, reject ) => {
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
                                    reject( interceptError( e ) )
                                }
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
                                reject( interceptError( e ) )
                            } finally { timer.exit() }
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
        } );
    } );
} );
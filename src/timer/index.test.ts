import { MAX_ITER_DURATION } from '../constants';

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
        describe( 'double trigger', () => {
            let calledImmediately, calledAfterDelay;
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
                    jest.useRealTimers();
                    timeoutSpy.mockRestore();
                });
                type Runner = ( label : string, delay : any, expectedNumRefreshes : number, expectTimeRemaningRange? : { max : number, min : number } ) => void; 
                const runTest : Runner = ( label, delay, expectedNumRefreshes /* must be sufficient to bring time remaining at early termination within the MAX_SAFE_INTEGER range */,  expectedTimeRemainingRange ) => {
                    test( label, done => {
                        const timer = new Timer( handlerMock, delay );
                        origSetTimeout( () => {
                            if( expectedTimeRemainingRange ) {
                                try {
                                    expect( timer.disposed ).toBe( false );
                                    const actualTimeRemaining = timer.currentWaitTime as number
                                    const { min, max } = expectedTimeRemainingRange;
                                    expect( actualTimeRemaining >= min && actualTimeRemaining < max ).toBe( true );
                                } catch( e ) {
                                    throw e;
                                } finally {
                                    timer.exit();
                                    done();
                                }
                                return;
                            }
                            try {
                                expect( handlerMock ).toHaveBeenCalledTimes( 1 );
                                expect( timeoutSpy ).toHaveBeenCalledTimes( expectedNumRefreshes );
                            } catch( e ) {
                                done();
                                throw e;
                            }
                            done();
                        }, expectedNumRefreshes * 6 );
                    } );
                }
                runTest(
                    'accepts any positive integer up to MAX_SAFE_INTEGER',
                    3.156e10, /* 360 DAYS IN MS (greater than the jest 2,147,483,647ms global timeout limit  ) */
                    Math.ceil( 3.156e10 / MAX_ITER_DURATION )
                );
                runTest(
                    'accepts any positive big integer',
                    BigInt( 3.156e10 ), /* 360 DAYS IN MS (greater than the jest 2,147,483,647ms global timeout limit  ) */
                    Math.ceil( 3.156e10 / MAX_ITER_DURATION )
                );
                runTest(
                    'accepts any HUMONGOUS positive big integer surpassing MAX_SAFE_INTEGER - alpha testing',
                    9007200754740991n, // (MAX_SAFE_INTEGER + 1.5e9)ms
                    1,
                    {
                        min: Math.max( 0, Number.MAX_SAFE_INTEGER - ( MAX_ITER_DURATION + 1.5e9 ) ),
                        max: Number.MAX_SAFE_INTEGER
                    }
                );
                // test.concurrent( 'accepts any positive integer up to MAX_SAFE_INTEGER', () => {
                //     const timeoutSpy = jest.spyOn( global, 'setTimeout' );
                //     const handlerMock = jest.fn();
                //     new Timer( handlerMock, Number.MAX_SAFE_INTEGER );
                //     expect( handlerMock ).not.toHaveBeenCalled();
                //     for( let t = Number.MAX_SAFE_INTEGER; t > 0; t =- 2e9 ) {
                //         jest.advanceTimersByTime( 2e9 );
                //     }
                //     expect( handlerMock ).toHaveBeenCalledTimes( 1 );
                //     expect( timeoutSpy ).toHaveBeenCalledTimes( Number.parseInt( Number.MAX_SAFE_INTEGER / 5e3 as unknown as string ) );
                //     timeoutSpy.mockClear();
                // } );

            } );
        } );
    } );
} );

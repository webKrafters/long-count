import type { IEventMock } from '../../test-artifacts/global-events';

import { MAX_SET_TIMEOUT_DELAY } from '../constants';

import TimerObservable from '../observable/index';

import { setupMocks as getEventMocks } from '../../test-artifacts/global-events';

import Timer from './index';

const noop = () => {};

let warnSpy;
let eMocks : IEventMock;
beforeAll(() => {
    eMocks = getEventMocks();
    jest.useFakeTimers();
    warnSpy = jest
        .spyOn( global.console, 'warn' )
        .mockReturnValue( undefined );
});
afterAll(() => {
    eMocks.mockRestore();
    jest.useRealTimers();
    warnSpy.mockRestore();
});

describe( 'Timer', () => {
    test( 'is an observable timer', () => {
        expect( new Timer( noop ) ).toBeInstanceOf( TimerObservable );
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
        describe( '`maxTimeoutDelay` property', () => test(
            'see complete test in "./src/timer/index.realtime.test.ts"',
            () => expect( true ).toBe( true )
        ) );
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
        describe( 'values and ranges', () => {
            test( 'defaults to 0 for negative integer', () => {
                const DELAY = -1e5;
                const handlerMock = jest.fn();
                new Timer( handlerMock, DELAY );
                expect( handlerMock ).not.toHaveBeenCalled();
                jest.advanceTimersByTime( 0 );
                expect( handlerMock ).toHaveBeenCalledTimes( 1 );
            } );
        } );
    } );
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
        test( 'is in full effect', async () => {
            expect( calledImmediately && calledAfterDelay ).toBe( true );
        } );
        test(
            'executes immediately following instantiation',
            async () => expect( calledImmediately ).toBe( true )
        );
        test(
            'executes after delay time reached',
            async () => expect( calledAfterDelay ).toBe( true )
        );
    } );
    describe( 'behavior at beyond the platform max setTimeout delay', () => test(
        'see complete test in "./src/timer/index.realtime.test.ts"',
        () => expect( true ).toBe( true )
    ) );
    describe( 'device "sleep" mode detection and management in environment', () => {
        describe( 'lacking `document.addEventListener` support', () => {
            test( 'issues a warning and proceeds without "sleep" detection', () => { 
                eMocks.mockClear();
                const origDocAddEventListener = global.document.addEventListener;
                global.document.addEventListener = require( '../util/index' ).noop;
                warnSpy.mockClear();
                const timer = new Timer( noop );
                expect( eMocks.addEventListener ).not.toHaveBeenCalled();
                expect( warnSpy ).toHaveBeenCalledTimes( 1 );
                expect( warnSpy ).toHaveBeenCalledWith(
                    'Cannot conduct long count with this machine. The Global document property with `addEventListener` method not supported.'
                );
                timer.exit();
                global.document.addEventListener = origDocAddEventListener;
            } );
        } )
        describe( 'with `document.addEventListener` support', () => {
            test( 'initiates detection listener', () => {
                eMocks.mockClear();
                warnSpy.mockClear();
                const timer = new Timer( noop );
                expect( eMocks.addEventListener ).toHaveBeenCalledTimes( 1 );
                expect( eMocks.addEventListener ).toHaveBeenCalledWith(
                    'visibilitychange',
                    expect.any( Function )
                );
                expect( warnSpy ).not.toHaveBeenCalled();
                timer.exit();
            } );
            describe( 'entering sleep mode', () => {
                let initDispatchTest, origDoc, wDocEvent;
                let timerClearTimeoutSpy, timerDispatchEventSpy;
                beforeAll(() => {
                    timerClearTimeoutSpy = jest.spyOn( Timer.prototype, 'clearTimeout' ).mockReturnValue( undefined );
                    timerDispatchEventSpy = jest.spyOn( Timer.prototype, 'dispatchEvent' ).mockReturnValue( undefined );
                    origDoc = global.document;
                    global.document = ({ ...global.document, visibilityState: 'hidden' });
                    wDocEvent = new Event( 'visibilitychange' );
                    initDispatchTest = () => {
                        eMocks.dispatchEvent.mockClear();
                        global.document.dispatchEvent( wDocEvent );
                        expect( eMocks.dispatchEvent ).toHaveBeenCalledTimes( 1 );
                        expect( eMocks.dispatchEvent ).toHaveBeenCalledWith( wDocEvent );
                    };
                });
                beforeEach(() => { jest.clearAllMocks() });
                afterAll(() => {
                    timerClearTimeoutSpy.mockRestore();
                    timerDispatchEventSpy.mockRestore();
                    global.document = origDoc;
                });
                test( 'suspends timer if unused delay cycle(s) remain', () => {
                    /* null hypothesis */
                    initDispatchTest();
                    expect( timerClearTimeoutSpy ).not.toHaveBeenCalled();
                    expect( timerDispatchEventSpy ).not.toHaveBeenCalled();
                    /* hypothesis */
                    const timer = new Timer( noop );
                    timerDispatchEventSpy.mockClear(); // any post-creation dispatches
                    initDispatchTest();
                    expect( timerClearTimeoutSpy ).toHaveBeenCalledTimes( 1 );
                    expect( timerDispatchEventSpy ).toHaveBeenCalledTimes( 1 );
                    expect( timerDispatchEventSpy ).toHaveBeenCalledWith(
                        'suspend', expect.objectContaining({
                            timeRemaining: expect.any( Number )
                        })
                    );
                    timer.exit();
                } );
            } );
            describe( 'waking up', () => {
                let initDispatchTest, origDoc, wDocEvent;
                let timerBeginIterationSpy, timerEndIterationSpy;
                let timerDispatchEventSpy, timerSetTimeoutSpy;
                let DateNowSpy;
                beforeAll(() => {
                    DateNowSpy = jest.spyOn( Date, 'now' );
                    timerBeginIterationSpy = jest.spyOn( Timer.prototype, 'beginIteration' );
                    timerEndIterationSpy = jest.spyOn( Timer.prototype, 'endIteration' );
                    timerDispatchEventSpy = jest.spyOn( Timer.prototype, 'dispatchEvent' );
                    timerSetTimeoutSpy = jest.spyOn( Timer.prototype, 'setTimeout' );
                    origDoc = global.document;
                    wDocEvent = new Event( 'visibilitychange' );
                    initDispatchTest = ( visibilityState : 'hidden' | 'visible' ) => {
                        global.document = ({ ...global.document, visibilityState });
                        eMocks.dispatchEvent.mockClear();
                        global.document.dispatchEvent( wDocEvent );
                        expect( eMocks.dispatchEvent ).toHaveBeenCalledTimes( 1 );
                        expect( eMocks.dispatchEvent ).toHaveBeenCalledWith( wDocEvent );
                    };
                });
                beforeEach(() => { jest.clearAllMocks() });
                afterAll(() => {
                    DateNowSpy.mockRestore();
                    timerBeginIterationSpy.mockRestore();
                    timerEndIterationSpy.mockRestore();
                    timerDispatchEventSpy.mockRestore();
                    timerSetTimeoutSpy.mockRestore();
                    global.document = origDoc;
                });
                test(
                    'begins a new cycle if device "sleep" began in between cycles',
                    () => new Promise(( resolve, reject ) => {
                        const timer = new Timer( noop, MAX_SET_TIMEOUT_DELAY * 3 );
                        let hideOnce = false;
                        
                        // at the end of first cycle
                        const cycleEndHandler = () => { 
                            if( hideOnce ) {
                                return timer.removeEventListener( 'cycleEnding', cycleEndHandler );
                            }
                            hideOnce = true;
                            
                            // trigger the sleep mode
                            initDispatchTest( 'hidden' ); 
                            
                            // initiate an event loop cycle wait
                            ( new Promise(( resolve, reject )  => { 
                                try {
                                    timerBeginIterationSpy.mockClear();
                                    timerEndIterationSpy.mockClear();
                                    timerDispatchEventSpy.mockClear();
                                    timerSetTimeoutSpy.mockClear();
                                    jest.advanceTimersByTime( 2e6 );
                                    initDispatchTest( 'visible' ); // trigger the wakeup call after 2e6 ms sleep
                                    expect( timerBeginIterationSpy ).toHaveBeenCalledTimes( 1 );
                                    expect( timerEndIterationSpy ).not.toHaveBeenCalled();
                                    expect( timerDispatchEventSpy ).toHaveBeenCalledTimes( 2 );
                                    expect( timerDispatchEventSpy.mock.calls[ 0 ] ).toEqual([ 'resume', expect.any( Object ) ]);
                                    expect( timerDispatchEventSpy.mock.calls[ 1 ] ).toEqual([ 'cycleStarted', expect.any( Object ) ]);
                                    expect( timerSetTimeoutSpy ).toHaveBeenCalledTimes( 1 );
                                    resolve( true );
                                } catch( e ) { reject( e ) } finally { timer.exit() }
                            } ) ).then( resolve ).catch( reject );
                        };
                        
                        /* arrange sleep mode to coincide with current cycle end */
                        timer.addEventListener( 'cycleEnding', cycleEndHandler );
                        
                        /* cause the current time at cycle-end and any incidential sleep mode to be recorded later */ 
                        DateNowSpy.mockReturnValue( Date.now() + MAX_SET_TIMEOUT_DELAY + 1e3 );
                        
                        /* complete up current cycle */
                        jest.runAllTimers(); 
                    } )
                );
                test(
                    'begins a new cycle if device "sleep" began amid and outlasted a given cycle',
                    () => new Promise(( resolve, reject ) => {
                        const timer = new Timer( noop, MAX_SET_TIMEOUT_DELAY * 3 );

                        // device enters "sleep" mode with 10,000ms 
                        // remaining on the current cycle clock.
                        jest.advanceTimersByTime( MAX_SET_TIMEOUT_DELAY - 1e4 );

                        /* cause the current time at cycle-end and any incidential sleep mode to be recorded later */ 
                        DateNowSpy.mockReturnValue( Date.now() + MAX_SET_TIMEOUT_DELAY + 1e3 );
                        
                        // trigger the sleep mode
                        initDispatchTest( 'hidden' ); 
                        
                        // initiate an event loop cycle wait
                        ( new Promise(( resolve, reject )  => {
                            try {
                                timerBeginIterationSpy.mockClear();
                                timerEndIterationSpy.mockClear();
                                timerDispatchEventSpy.mockClear();
                                timerSetTimeoutSpy.mockClear();

                                // sleeps ~(2e6 - 1e4) ms longer than 1e4 ms remaining
                                // on the current cycle clock.
                                jest.advanceTimersByTime( 2e6 );
                                
                                // triggering device wake-up call
                                initDispatchTest( 'visible' ); 

                                expect( timerBeginIterationSpy ).toHaveBeenCalledTimes( 1 );
                                expect( timerEndIterationSpy ).not.toHaveBeenCalled();
                                expect( timerDispatchEventSpy ).toHaveBeenCalledTimes( 2 );
                                expect( timerDispatchEventSpy.mock.calls[ 0 ] ).toEqual([ 'resume', expect.any( Object ) ]);
                                expect( timerDispatchEventSpy.mock.calls[ 1 ] ).toEqual([ 'cycleStarted', expect.any( Object ) ]);
                                expect( timerSetTimeoutSpy ).toHaveBeenCalledTimes( 1 );
                                resolve( true );
                            } catch( e ) { reject( e ) } finally { timer.exit() }
                        } ) ).then( resolve ).catch( reject );
                    } )
                );
                test(
                    'resumes timer if device went into "sleep" mode and awoke amid an ongoing cycle',
                    () => new Promise(( resolve, reject ) => {
                        const timer = new Timer( noop, MAX_SET_TIMEOUT_DELAY * 1e6 );
                        
                        // device enters "sleep" mode with 10,000ms 
                        // remaining on the current cycle clock.
                        jest.advanceTimersByTime( MAX_SET_TIMEOUT_DELAY - 1e4 );
                        
                        // trigger the sleep mode( new Promise(( resolve, reject )  => { // initiate an event loop cycle wait
                        initDispatchTest( 'hidden' );

                        // initiate an event loop cycle wait
                        ( new Promise(( resolve, reject )  => { 
                            try {
                                timerBeginIterationSpy.mockClear();
                                timerEndIterationSpy.mockClear();
                                timerDispatchEventSpy.mockClear();
                                timerSetTimeoutSpy.mockClear();

                                // sleeps 3000ms of the 10000ms remaining on the current cycle clock.
                                jest.advanceTimersByTime( 3e3 );
                                DateNowSpy.mockReturnValue( Date.now() );
                                initDispatchTest( 'visible' ); // triggering device wake-up call

                                expect( timerBeginIterationSpy ).not.toHaveBeenCalled();
                                expect( timerEndIterationSpy ).not.toHaveBeenCalled();
                                expect( timerDispatchEventSpy ).toHaveBeenCalledTimes( 2 );
                                expect( timerDispatchEventSpy.mock.calls[ 0 ] ).toEqual([ 'resume', expect.any( Object ) ]);
                                expect( timerDispatchEventSpy.mock.calls[ 1 ] ).toEqual([ 'cycleStarted', expect.any( Object ) ]);
                                expect( timerSetTimeoutSpy ).toHaveBeenCalledTimes( 1 );
                                resolve( true );
                            } catch( e ) { reject( e ) } finally { timer.exit() }
                        } ) ).then( resolve ).catch( reject );
                    } )
                );
                test(
                    'invokes handler and exits timer if device "slept" beyond the entire timeout length',
                    () => new Promise(( resolve, reject ) => {
                        const timer = new Timer( noop, MAX_SET_TIMEOUT_DELAY * 1e6 );
                        
                        // device enters "sleep" mode with 10,000ms 
                        // remaining on the current cycle clock.
                        jest.advanceTimersByTime( MAX_SET_TIMEOUT_DELAY * 1e4 );
                        // DateNowSpy.mockReturnValue( Date.now() + ( MAX_SET_TIMEOUT_DELAY - 1e4 ) );
                        initDispatchTest( 'hidden' ); // trigger the sleep mode( new Promise(( resolve, reject )  => { // initiate an event loop cycle wait
                        
                        ( new Promise(( resolve, reject )  => { // initiate an event loop cycle wait
                            try {
                                timerBeginIterationSpy.mockClear();
                                timerEndIterationSpy.mockClear();
                                timerDispatchEventSpy.mockClear();
                                timerSetTimeoutSpy.mockClear();

                                // sleeps 3000ms of the 10000ms remaining on the current cycle clock.
                                DateNowSpy.mockReturnValue( 2126006663046353 );

                                // triggering device wake-up call
                                initDispatchTest( 'visible' ); 

                                expect( timerBeginIterationSpy ).not.toHaveBeenCalled();
                                expect( timerEndIterationSpy ).not.toHaveBeenCalled();
                                expect( timerDispatchEventSpy ).toHaveBeenCalledTimes( 2 );
                                expect( timerDispatchEventSpy.mock.calls[ 0 ] ).toEqual([ 'resume', expect.any( Object ) ]);
                                expect( timerDispatchEventSpy.mock.calls[ 1 ] ).toEqual([ 'exit', expect.any( Object ) ]);
                                expect( timerSetTimeoutSpy ).toHaveBeenCalledTimes( 0 );
                                resolve( true );
                            } catch( e ) { reject( e ) } finally { timer.exit() }
                        } ) ).then( resolve ).catch( reject );
                    } )
                );
            } );
            test( 'closes detection listener at the end of the timer', () => {
                eMocks.mockClear();
                const timer = new Timer( noop );
                expect( eMocks.removeEventListener ).not.toHaveBeenCalled();
                timer.exit();
                expect( eMocks.removeEventListener ).toHaveBeenCalledTimes( 1 );
                expect( eMocks.removeEventListener ).toHaveBeenCalledWith(
                    'visibilitychange',
                    expect.any( Function )
                );
            } );
        } );
    } );
} );


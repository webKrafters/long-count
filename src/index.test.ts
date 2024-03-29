import { MAX_SET_TIMEOUT_DELAY } from './constants';
import * as main from './index';

import TimerObservable from './observable';
import Timer from './timer';

const noop = () => {};

beforeAll(() => { jest.useFakeTimers() });
afterAll(() => {
    jest.useRealTimers();
    main.internal.unwatch();
});

interface LongCounterSpiesType {
    addEventListener : jest.SpyInstance;
    cancel : jest.SpyInstance;
}

describe( 'package main', () => {
    const LongCounterSpies = {} as LongCounterSpiesType;
    beforeAll(() => {
        jest.spyOn( console, 'warn' ).mockReturnValue( undefined );
        LongCounterSpies.addEventListener = jest.spyOn(
            main.LongCounter.prototype, 'addEventListener'
        );
        LongCounterSpies.cancel = jest.spyOn(
            main.LongCounter.prototype, 'cancel'
        );
    });
    afterAll(() => jest.restoreAllMocks());
    describe( 'LongCounter', () => {
        describe( 'polymorphic type', () => {
            let instance : main.LongCounter | undefined;
            beforeAll(() => { instance = new main.LongCounter( new Timer( noop ) ) });
            afterAll(() => { instance = undefined })
            test( 'is a LongCounter', () => { expect( instance ).toBeInstanceOf( main.LongCounter ) } );
            test( 'is a TimerObservable', () => { expect( instance ).toBeInstanceOf( TimerObservable ) } );
            test( 'is NOT an Interval', () => { expect( instance ).not.toBeInstanceOf( main.Interval ) } );
        } );
    } );
    describe( 'Interval', () => {
        describe( 'polymorphic type', () => {
            let instance : main.Interval | undefined;
            beforeAll(() => { instance = new main.Interval( new Timer( noop ) ) });
            afterAll(() => { instance = undefined })
            test( 'is an Interval', () => { expect( instance ).toBeInstanceOf( main.Interval ) } );
            test( 'is a LongCounter', () => { expect( instance ).toBeInstanceOf( main.LongCounter ) } );
        } );
        test( 'throws on attempt to update its internal timer mechanism', () => {
            expect(() => {
                new main.Interval( new Timer( noop ) ).updateTimer(
                    new Timer( noop ),
                    expect.any( Number )
                );
            }).toThrow( SyntaxError );
        } );
    } );
    describe.each([
        [ 'Interval', main.setInterval, main.clearInterval ],
        [ 'Timeout', main.setTimeout, main.clearTimeout ]
    ] )( 'shared functionalities', ( timerLabel, setTimer, clearTimer ) => {
        describe( `\`clear${ timerLabel }(...)\` cancels counter`, () => {
            test( 'using the counter instance', () => {
                LongCounterSpies.cancel.mockClear();
                const delay = 1e5;
                const t = setTimer( noop, delay );
                jest.advanceTimersByTime( 9e4 ); 
                expect( LongCounterSpies.cancel ).not.toHaveBeenCalled();
                expect( t.expired ).toBe( false );
                clearTimer( t );
                expect( LongCounterSpies.cancel ).toHaveBeenCalledTimes( 1 );
                expect( t.expired ).toBe( true );
            } );
            test( 'using the counter instance "id" property alone', () => {
                LongCounterSpies.cancel.mockClear();
                const delay = 1e5;
                const t = setTimer( noop, delay );
                jest.advanceTimersByTime( 9e4 ); 
                expect( LongCounterSpies.cancel ).not.toHaveBeenCalled();
                expect( t.expired ).toBe( false );
                clearTimer( t.id ); // <----
                expect( LongCounterSpies.cancel ).toHaveBeenCalledTimes( 1 );
                expect( t.expired ).toBe( true );
            } );
            test( 'disarming the handler', () => {
                const delay = 1e5;
                const handlerMock = jest.fn();
                clearTimer( setTimer( handlerMock, delay ) );
                jest.advanceTimersByTime( 1e6 );
                expect( handlerMock ).not.toHaveBeenCalled();
            } );
        } );
    } );
    describe( 'setInterval(...)', () => {
        describe( 'normal', () => {
            let counter : main.Interval;
            let restartedCounterAtExit : boolean = false;
            beforeAll(() => {
                LongCounterSpies.addEventListener.mockClear();
                LongCounterSpies.cancel.mockClear();
                const delay = 1e3;
                counter = main.setInterval( noop, delay );
                restartedCounterAtExit = !LongCounterSpies.cancel.mock.calls.length;
                if( !restartedCounterAtExit ) { return }
                restartedCounterAtExit = !counter.expired;
                if( !restartedCounterAtExit ) { return }
                jest.advanceTimersByTime( delay + 100 ); // exhaust timer thoroughly
                if( !restartedCounterAtExit ) { return }
                restartedCounterAtExit = !!LongCounterSpies.cancel.mock.calls.length;
                if( !restartedCounterAtExit ) { return }
                restartedCounterAtExit = !counter.expired;
                counter.cancel();
            });
            test( 'returns a LongCounter instance', () => {
                expect( counter ).toBeInstanceOf( main.LongCounter );
            } );
            test( 'monitors delay time expiration', () => {
                expect( LongCounterSpies.addEventListener ).toHaveBeenCalledTimes( 1 );
                expect( LongCounterSpies.addEventListener ).
                    toHaveBeenCalledWith( 'exit', expect.any( Function ) );
            } );
            test( 'cleans up LongCounter internal timer at delay expiratio', () => {
                expect( restartedCounterAtExit ).toBe( true );
            } );
        } );
        test( 'handles delays beyond the device limit', () => {
            jest.clearAllMocks();
            const delay = MAX_SET_TIMEOUT_DELAY * 10; // 10x the normal device timeout limit
            const handlerMock = jest.fn();
            let t : main.Interval | undefined = main.setInterval( handlerMock, delay );
            for( let i = 3; i--; ) {
                expect( t.expired ).toBe( false );
                expect( t.timeRemaining ).toBeGreaterThan( delay - 1e3 );
                expect( t.timeRemaining ).toBeLessThanOrEqual( delay + 1e3 );
                expect( t.cancel ).not.toHaveBeenCalled();
                const at90Pct = MAX_SET_TIMEOUT_DELAY * 9;
                jest.advanceTimersByTime( at90Pct );
                expect( t.expired ).toBe( false );
                expect( t.timeRemaining ).toBeGreaterThan( ( delay - at90Pct ) - 1e3 );
                expect( t.timeRemaining ).toBeLessThanOrEqual( ( delay - at90Pct ) + 1e3 );
                expect( t.cancel ).not.toHaveBeenCalled();
                jest.advanceTimersByTime( MAX_SET_TIMEOUT_DELAY ); // use up the remaining delay
                expect( t.expired ).toBe( false );
                expect( t.timeRemaining ).toBeGreaterThan( delay - 1e3 );
                expect( t.timeRemaining ).toBeLessThanOrEqual( delay + 1e3 );
                expect( t.cancel ).toHaveBeenCalledTimes( 1 ); // discards old timer for a new one
                jest.clearAllMocks();
            }
            expect( t.expired ).toBe( false );
            expect( t.timeRemaining ).toBeGreaterThan( delay - 1e3 );
            expect( t.timeRemaining ).toBeLessThanOrEqual( delay + 1e3 );
            /* ... */
            t.cancel(); // turn off the counter;
            t = undefined;
        } );
    } );
    describe( 'setTimeout(...)', () => {
        describe( 'normal', () => {
            let counter : main.LongCounter;
            let calledCancelAtExit : boolean = false;
            beforeAll(() => {
                LongCounterSpies.addEventListener.mockClear();
                LongCounterSpies.cancel.mockClear();
                const delay = 1e3;
                counter = main.setTimeout( noop, delay );
                calledCancelAtExit = !LongCounterSpies.cancel.mock.calls.length;
                if( !calledCancelAtExit ) { return }
                calledCancelAtExit = !counter.expired;
                if( !calledCancelAtExit ) { return }
                jest.advanceTimersByTime( delay + 100 ); // exhaust timer thoroughly
                if( !calledCancelAtExit ) { return }
                calledCancelAtExit = !!LongCounterSpies.cancel.mock.calls.length;
                if( !calledCancelAtExit ) { return }
                calledCancelAtExit = counter.expired;
            });
            test( 'returns a LongCounter instance', () => {
                expect( counter ).toBeInstanceOf( main.LongCounter );
            } );
            test( 'monitors delay time expiration', () => {
                expect( LongCounterSpies.addEventListener ).toHaveBeenCalledTimes( 1 );
                expect( LongCounterSpies.addEventListener ).
                    toHaveBeenCalledWith( 'exit', expect.any( Function ) );
            } );
            test( 'cleans up LongCounter internal timer at delay expiratio', () => {
                expect( calledCancelAtExit ).toBe( true );
            } );
        } );
        test( 'handles delays beyond the device limit', () => {
            jest.clearAllMocks();
            const delay = MAX_SET_TIMEOUT_DELAY * 10; // 10x the normal device timeout limit
            const handlerMock = jest.fn();
            const t = main.setTimeout( handlerMock, delay );
            expect( t.expired ).toBe( false );
            expect( t.timeRemaining ).toBe( delay );
            expect( t.cancel ).not.toHaveBeenCalled();
            const at90Pct = MAX_SET_TIMEOUT_DELAY * 9;
            jest.advanceTimersByTime( at90Pct );
            expect( t.expired ).toBe( false );
            expect( t.timeRemaining ).toBeGreaterThan( ( delay - at90Pct ) - 1e3 );
            expect( t.timeRemaining ).toBeLessThanOrEqual( ( delay - at90Pct ) + 1e3 );
            expect( t.cancel ).not.toHaveBeenCalled();
            jest.advanceTimersByTime( MAX_SET_TIMEOUT_DELAY ); // use up the remaining delay
            expect( t.expired ).toBe( true );
            expect( t.timeRemaining ).toBeUndefined();
            expect( t.cancel ).toHaveBeenCalledTimes( 1 );
        } );
    } );
} );

describe( 'internal caller passcode', () => {
    test( 'updates every `$ttl` milliseconds', () => {
        jest.isolateModules(() => {
            jest.useFakeTimers();
            const { internal } = require( './index' );
            internal.watch();
            const currentPassCode = internal.current;
            jest.advanceTimersByTime( internal.ttl - 10 );
            expect( internal.current ).toBe( currentPassCode );
            expect( internal.is( currentPassCode ) ).toBe( true );
            jest.advanceTimersByTime( 50 );
            expect( internal.current ).not.toBe( currentPassCode );
            internal.unwatch();
            jest.useRealTimers();
        });
    } );
    test( 'grants old passcode a 10-second grace period', () => {
        jest.isolateModules(() => {
            jest.useFakeTimers();
            const { internal } = require( './index' );
            
            

            // @debug
            console.log( `${ '0'.repeat( 12 ) } >>>>>`, { currentPassCode: undefined, ...internal });


            internal.watch();

            const currentPassCode = internal.current;
            jest.advanceTimersByTime( internal.ttl );
            expect( internal.current ).not.toBe( currentPassCode );

            // @debug
            console.log( `${ '1'.repeat( 12 ) } >>>>>`, { currentPassCode, ...internal });

            expect( internal.is( currentPassCode ) ).toBe( true );
            jest.advanceTimersByTime( 9e3 );

            // @debug
            console.log( `${ '2'.repeat( 12 ) } >>>>>`, { currentPassCode, ...internal });

            expect( internal.current ).not.toBe( currentPassCode );
            expect( internal.is( currentPassCode ) ).toBe( true );
            jest.advanceTimersByTime( 1e3 );

            // @debug
            console.log( `${ '3'.repeat( 12 ) } >>>>>`, { currentPassCode, ...internal });

            expect( internal.current ).not.toBe( currentPassCode );
            expect( internal.is( currentPassCode ) ).toBe( false );
            internal.unwatch();

            // @debug
            console.log( `${ '4'.repeat( 12 ) } >>>>>`, { currentPassCode, ...internal });

            jest.useRealTimers();
        });
    } );
} );
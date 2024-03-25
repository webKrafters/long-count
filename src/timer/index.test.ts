import { MAX_SET_TIMEOUT_DELAY } from '../constants';

import TimerObservable from '../observable/index';

import Timer from './index';

const noop = () => {};

let warnSpy;
beforeAll(() => {
    jest.useFakeTimers();
    warnSpy = jest
        .spyOn( global.console, 'warn' )
        .mockReturnValue( undefined );
});
afterAll(() => {
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
} );
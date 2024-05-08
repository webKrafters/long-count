// @ts-nocheck

import Timer from './timer';
import { internal, setInterval, setTimeout } from './main';

jest.mock( './timer' );

const noop = () => {};

describe( 'Using mocked Timer class', () => {
    beforeAll(() => { jest.useFakeTimers() })
    beforeEach(() => { Timer.mockClear() });
    afterAll(() => { internal.unwatch() });
    describe.each([
        [ 'Interval', setInterval ],
        [ 'Timeout', setTimeout ]
    ] )( 'shared functionalities', ( timerLabel, setTimer ) => {
        describe( 'resolving options argument', () => {
            const runTestWith = ( counterArgs, expectResolvesOptions ) => {
                setTimer( ...counterArgs );
                expect( Timer ).toHaveBeenCalledTimes( 1 );
                expect( Timer.mock.calls[ 0 ][ 2 ] ).toEqual( expectResolvesOptions );
            }
            test( 'converts `undefined` to default options payload', () => {
                runTestWith([ noop ], { immediate: false });
            } );
            test( 'converts `boolean` type to a matching default payload object', () => {
                runTestWith([ noop, undefined, true /* options arg */  ], { immediate: true });
            } );
            test( 'accepts partial payload object as-is', () => {
                const payload = { maxTimeoutDelay: 3500 };
                runTestWith( [ noop, undefined, payload /* options arg */ ], payload );
            } );
            test( 'accepts full payload object as-is', () => {
                const payload = { immediate: false, maxTimeoutDelay: 1e5 };
                runTestWith( [ noop, undefined, payload /* options arg */ ], payload );
            } );
        } );
    } );
} );
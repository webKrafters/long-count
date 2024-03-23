import { getDefaultObserverMap } from './index';

describe( 'TimerObservable helpers', () => {
    describe( 'getDefaultObservation(...)', () => {
        let map;
        beforeAll(() => { map = getDefaultObserverMap() });
        afterAll(() => { map = null });
        test( 'returns object with 5 properties represeting event types', () => {
            expect( Object.keys( map ) ).toHaveLength( 5 );
        } );
        test( 'adheres to specific event types', () => {
            expect( Object.keys( map ) ).toStrictEqual([ 'cycleEnding', 'cycleStarted', 'exit', 'resume', 'suspend' ])
        } );
        test( 'holds storage set per observed event type', () => {
            expect( Object.values( map ).every( s => s instanceof Set ) ).toBe( true );
        } );
    })
} );
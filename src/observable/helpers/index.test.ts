import { getDefaultObserverMap } from './index';

describe( 'TimerObservable helpers', () => {
    describe( 'getDefaultObservation(...)', () => {
        let map;
        beforeAll(() => { map = getDefaultObserverMap() });
        afterAll(() => { map = null });
        test( 'returns object with 3 properties represeting event types', () => {
            expect( Object.keys( map ) ).toHaveLength( 3 );
        } );
        [ 'exit', 'resume', 'suspend' ].forEach( k => test(
            `contains the ${ k } event entry`,
            () => { expect( k in map ).toBe( true ) }
        ) );
        test( 'holds storage set per observed event type', () => {
            expect(
                Object
                    .values( map )
                    .every( s => s instanceof Set )
            ).toBe( true );
        } );
    })
} );
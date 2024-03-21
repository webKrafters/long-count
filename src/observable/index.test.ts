import TimerObservable from './index';

let setAddSpy, setDeleteSpy;
beforeAll(() => {
    setAddSpy = jest.spyOn( Set.prototype, 'add' );
    setDeleteSpy = jest.spyOn( Set.prototype, 'delete' );
});
afterAll(() => {
    setAddSpy.mockRestore();
    setDeleteSpy.mockRestore();
})

describe( 'TimerObservable', () => {
    test( 'sets up a default observable storage on instantiation', () => {
        const { deps } = require( '.' );
        const getObserversSpy = jest
            .spyOn( deps, 'getObservers' )
            .mockReturnValueOnce( undefined );
        new TimerObservable();
        expect( getObserversSpy ).toHaveBeenCalledTimes( 1 );
        getObserversSpy.mockRestore();
    } );
    test( 'adds event listener to a corresponding partition of the storage', () => {
        setAddSpy.mockClear();
        const testListener = () => {};
        ( new TimerObservable() ).addEventListener( 'resume', testListener );
        expect( setAddSpy ).toHaveBeenCalledTimes( 1 );
        expect( setAddSpy ).toHaveBeenCalledWith( testListener );
    } );
    test( 'will not add listener for an invalid event type in the storage', () => {
        setAddSpy.mockClear();
        const testListener = () => {}
        ( new TimerObservable() ).addEventListener( 'invalid-event-type', testListener );
        expect( setAddSpy ).not.toHaveBeenCalled();
    } );
    describe( 'event dispatch', () => {
        let observable;
        beforeAll(() => { observable = new TimerObservable() });
        const dispatchedListenersFor = ( eventType, areAllCalled = true ) => {
            const listeners = [ jest.fn(), jest.fn(), jest.fn() ];
            listeners.forEach( l => observable.addEventListener( eventType, l ) );
            expect( listeners.every( l => l.mock.calls.length ) ).toBe( false );
            observable.dispatchEvent( eventType );
            expect( listeners.every( l => l.mock.calls.length ) ).toBe( areAllCalled );
        };
        const runTest = eventType => test(
            `invokes all listeners attached to valid eventtype: ${ eventType }`,
            () => dispatchedListenersFor( eventType )
        );
        runTest( 'exit' );
        runTest( 'resume' );
        runTest( 'suspend' );
        test(
            'ignores all listeners attached to valid eventtype',
            () => dispatchedListenersFor( 'invalid', false )
        );
    } );
    test( 'removes event listener from a corresponding partition of the storage', () => {
        setDeleteSpy.mockClear();
        const testListener = () => {}
        ( new TimerObservable() ).removeEventListener( 'resume', testListener );
        expect( setDeleteSpy ).toHaveBeenCalledTimes( 1 );
        expect( setDeleteSpy ).toHaveBeenCalledWith( testListener );
    } );
    test( 'will not remove event listener for an invalid event type', () => {
        setDeleteSpy.mockClear();
        const testListener = () => {}
        ( new TimerObservable() ).removeEventListener( 'invalid-event-type', testListener );
        expect( setDeleteSpy ).not.toHaveBeenCalled();
    } );
} );
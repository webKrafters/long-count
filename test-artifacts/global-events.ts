// @ts-nocheck

export type EventMethodName = "addEventListener" | "dispatchEvent" | "removeEventListener";

export type EventMethods = {[K in EventMethodName]: jest.Mock };

export type MockMethods = {[K in "mockClear" | "mockReset" | "mockRestore"]: () => void};

export interface IEventMock extends EventMethods, MockMethods {};

const EVENT_MEHTOD_NAMES : Array<EventMethodName> = [ 'addEventListener', 'dispatchEvent', 'removeEventListener' ];

export const setupMocks = () => {
    const listeners : {[type:string]: Set<EventListenerOrEventListenerObject>} = {};
    const mock : IEventMock = {};
    for( let name of EVENT_MEHTOD_NAMES ) {
        mock[ name ] = name in global.document
            ? jest.spyOn( global.document, name )
            : jest.fn();
    }
    mock.mockClear = function() { EVENT_MEHTOD_NAMES.forEach( n => this[ n ].mockClear() ) }
    mock.mockReset = function() { EVENT_MEHTOD_NAMES.forEach( n => this[ n ].mockReset() ) }
    mock.mockRestore = function() { EVENT_MEHTOD_NAMES.forEach( n => this[ n ].mockRestore() ) }
    mock.addEventListener.mockImplementation(( type, listener ) => {
        if( type in listeners ) { listeners[ type ].add( listener ) }
        listeners[ type ] = new Set([ listener ])
    });
    mock.dispatchEvent.mockImplementation(( event, ...args ) => listeners[ event.type ]?.forEach( e => e( ...args ) ));
    mock.removeEventListener.mockImplementation(( type, listener ) => listeners[ type ]?.delete( listener ));
    return mock;
};
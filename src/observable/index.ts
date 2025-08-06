import type {
    EventName,
    EventType,
    ITimerObservable,
    ObserverMap,
    VoidFn
} from '../index';

import { getDefaultObserverMap } from './helpers/index';

export const deps = { // tested dependencies
    getObservers: getDefaultObserverMap
};

class TimerObservable implements ITimerObservable {
    protected _observers : ObserverMap;
    constructor() { this._observers = deps.getObservers() }
    addEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void;
    addEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void;
    addEventListener( eventType, listener ) : void {
        this._observers[ eventType ]?.add( listener );
    }
    dispatchEvent<ARGS extends Array<any>>( eventType : EventType, ...args : ARGS ) : void;
    dispatchEvent<ARGS extends Array<any>>( eventType : EventName, ...args : ARGS ) : void;
    dispatchEvent( eventType, ...args ) : void {
        for( let listen of this._observers[ eventType ] ?? [] ) {
            listen( ...args )
        }
    }
    removeEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void
    removeEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void
    removeEventListener( eventType, listener ) : void {
        this._observers[ eventType ]?.delete( listener );
    }
}

export default TimerObservable;

import type { EventType, ITimerObservable, ObserverMap, VoidFn } from '../index';

import { getDefaultObserverMap } from './helpers/index';

export const deps = { // tested dependencies
    getObservers: getDefaultObserverMap
};

class TimerObservable implements ITimerObservable {
    protected observers : ObserverMap;
    constructor() { this.observers = deps.getObservers() }
    addEventListener( eventType : EventType, listener : VoidFn ) {
        this.observers[ eventType ]?.add( listener );
    }
    dispatchEvent( eventType : EventType, ...args : Array<any> ) {
        for( let listen of this.observers[ eventType ] ?? [] ) {
            listen( ...args )
        }
    }
    removeEventListener( eventType : EventType, listener : VoidFn ) {
        this.observers[ eventType ]?.delete( listener );
    }
}

export default TimerObservable;
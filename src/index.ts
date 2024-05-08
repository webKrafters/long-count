export type { default as TimerObservable } from './observable/index';

export type { default as Timer } from './timer/index';

export type { LongCounter, Interval } from './main';

export type Delay = BigInteger | Iterable<number> | IterableIterator<number> | number | string | undefined;

export type DelayTypeName = 'BigInt' | 'Invalid' | 'Iterable' | 'Number' | 'String' | 'Undefined' | 'Uint8Array'
 
export type EventType = 'cycleEnding' | 'cycleStarted' | 'exit' | 'resume' | 'suspend';

export interface ITimerObservable {
    addEventListener( eventType : EventType, listener : VoidFn ) : void;
    dispatchEvent( eventType : EventType, ...args : Array<any> ) : void;
    removeEventListener( eventType : EventType, listener : VoidFn ) : void
}

export type MyInteger = Uint8Array|number;

export type ObserverMap = {[ K in EventType ]: Set<VoidFn>};

export interface Options {
    immediate? : boolean, // set true to invoke timer handler once follwoing timer instantiation and then once following the delay window
    maxTimeoutDelay? : number // allows for declaring max timeout delay value allowed by the target platform
};

export type VoidFn<ARGS extends Array<unknown> = Array<unknown>> = ( ...args: ARGS ) => void;

export {
    clearInterval,
    clearTimeout,
    setInterval,
    setTimeout
} from './main';

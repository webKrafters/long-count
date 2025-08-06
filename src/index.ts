export type { default as TimerObservable } from './observable/index';

export type { default as Timer } from './timer/index';

export type { LongCounter, Interval } from './main';

export type Delay = BigInteger | Iterable<number> | IterableIterator<number> | number | string | undefined;

export type DelayTypeName = 'BigInt' | 'Invalid' | 'Iterable' | 'Number' | 'String' | 'Undefined' | 'Uint8Array'
 
export type EventName = 'cycleEnding' | 'cycleStarted' | 'exit' | 'resume' | 'suspend';

export const enum  EventType {
    END_CYCLE = 'cycleEnding',
    EXIT = 'exit',
    RESUME_CYCLE = 'resume',
    START_CYCLE = 'cycleStarted',
    SUSPEND_CYCLE = 'suspend'
};

export interface ITimerObservable {
    addEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void;
    addEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void;
    dispatchEvent<ARGS extends Array<any>>( eventType : EventType, ...args : ARGS ) : void;
    dispatchEvent<ARGS extends Array<any>>( eventType : EventName, ...args : ARGS ) : void;
    removeEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void
    removeEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void
}

export type MyInteger = Uint8Array|number;

export type ObserverMap = {[ K in EventName ]: Set<VoidFn>};

export interface Options {
    immediate? : boolean, // set true to invoke timer handler once follwoing timer instantiation and then once following the delay window
    maxTimeoutDelay? : number // allows for declaring max timeout delay value allowed by the target platform
};

export type VoidFn<ARGS extends Array<any> = Array<any>> = ( ...args: ARGS ) => void;

export {
    clearInterval,
    clearTimeout,
    setInterval,
    setTimeout
} from './main';

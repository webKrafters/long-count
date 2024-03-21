export type Args = Array<any>;

export type Delay = BigInteger|Iterable<number>|IterableIterator<number>|number|string|undefined;

export type DelayTypeName = 'BigInt'|'Invalid'|'Iterable'|'Number'|'String'|'Undefined'|'Uint8Array'

export type EventType = 'exit'|'resume'|'suspend';

export interface ITimerObservable {
    addEventListener( eventType : EventType, listener : VoidFn ) : void;
    dispatchEvent<ARGS extends Args = Args>( eventType : EventType, ...args : ARGS ) : void;
    removeEventListener( eventType : EventType, listener : VoidFn ) : void
}

export type MyInteger = Uint8Array|number;

export type ObserverMap = {[ K in EventType]: Set<VoidFn>};

export interface Options {
    immediate? : boolean,
    maxTimeoutDelay? : number
};

export type VoidFn = <ARGS extends Args = Args>( ...args: ARGS ) => void;

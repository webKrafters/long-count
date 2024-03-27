import type { Delay, EventType, Options, VoidFn } from './types';

import { $global } from './$global';

import TimerObservable from './observable/index';

import Timer from './timer/index';

export type Opts = Partial<Options>;

let counter = 0;

const longCounterMap : {
    [counterId:number]: LongCounter
} = {};

let internalCode = Math.random();
const isInternal = (() => {
    let prevCode;
    $global.setInterval(() => {
        prevCode = internalCode;
        internalCode = Math.random();
        $global.setTimeout( () => {
            prevCode = undefined;
        }, 1e4 );
    }, 1.08e7 ) // 3 hour cycle
    return ( envcode : number ) => envcode && ( envcode === internalCode || envcode === prevCode );
})();

export class LongCounter extends TimerObservable {
    #id : number;
    #timer : Timer;
    constructor( timer : Timer ) {
        super();
        this.#timer = timer;
        this.#id = ++counter;
        longCounterMap[ this.#id ] = this;
    }
    get id() { return this.#id }
    get timeRemaining() { return this.#timer?.currentWaitTime }
    protected get timer() { return this.#timer }
    protected set timer( timer ) { this.#timer = timer }
    addEventListener( eventType : EventType, listener : VoidFn ) {
        this.#timer &&
        this.observers[ eventType ].add( listener ) &&
        this.#timer.addEventListener( eventType, listener );
    }
    cancel() {
        delete longCounterMap[ this.id ];
        if( !this.#timer || this.#timer.disposed) { return }
        // preempts exit listeners
        for( let listener of this.observers.exit ) {
            this.#timer.removeEventListener( 'exit', listener );
        }
        this.#timer.exit();
        this.#timer = undefined;
    }
    dispatchEvent( eventType : EventType, ...args : Array<any> ) {
        this.#timer?.dispatchEvent( eventType, ...args );
    }
    removeEventListener( eventType : EventType, listener : VoidFn ) {
        this.#timer &&
        this.observers[ eventType ].delete( listener ) &&
        this.#timer.removeEventListener( eventType, listener );
    };
    valueOf() { return this.id }
}

export class Interval extends LongCounter {
    constructor( timer : Timer ) { super( timer ) }
    updateTimer ( timer : Timer, internalCode : number ) {
        if( !isInternal( internalCode ) ) { return }
        for( let [ eventType, listeners ] of Object.entries( this.observers ) ) {
            for( let listener of listeners ) {
                timer.addEventListener( eventType as EventType, listener );
            }
        }
        this.cancel();
        this.timer = timer;
        longCounterMap[ this.id ] = this;
    }
}

/** @param longCounter - LongCounter instance or its `id` property value */
const endLongCount = <T extends number|LongCounter>( longCounter : T ) => ( (
    typeof longCounter === 'number'
        ? longCounterMap[ longCounter ]
        : longCounter
) as LongCounter )?.cancel();

export const clearInterval = endLongCount;
export const clearTimeout = endLongCount;

/** @param options - The Timer options object or its `immediate` property value  */
const resolveTimerOptions = <T extends boolean|Opts>( options : T ) : Opts => (
    typeof options === 'boolean' ? { immediate: options } : options
);

export function setInterval( fn : VoidFn, delay? : Delay, option? : boolean, ...args : Array<any> ) : LongCounter;
export function setInterval( fn : VoidFn, delay? : Delay, option? : Opts, ...args : Array<any> ) : LongCounter;
export function setInterval( fn : VoidFn, delay : Delay = undefined, options : boolean|Opts = false , ...args : Array<any> ) {
    const tOptions = resolveTimerOptions( options );
    const interval = new Interval( new Timer( fn, delay, tOptions, ...args ) );
    interval.addEventListener( 'exit', () => interval.updateTimer(
        new Timer( fn, delay, { ...tOptions, immediate : false }, ...args ),
        internalCode
    ) );
    return interval;
};

export function setTimeout( fn : VoidFn, delay? : Delay, options? : boolean, ...args : Array<any> ) : LongCounter;
export function setTimeout( fn : VoidFn, delay? : Delay, options? : Opts, ...args : Array<any> ) : LongCounter;
export function setTimeout( fn : VoidFn, delay : Delay = undefined, options : any = false, ...args : Array<any> ) {
    const counter = new LongCounter( new Timer( fn, delay, resolveTimerOptions( options ), ...args ) );
    counter.addEventListener( 'exit', counter.cancel.bind( counter ) );
    return counter;
};

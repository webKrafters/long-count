import type { Delay, EventType, Options, VoidFn } from './index';

import { $global } from './$global';

import TimerObservable from './observable/index';

import Timer from './timer/index';

export type Opts = Partial<Options>;

let counter = 0;

const longCounterMap : {[ counterId : number ]: LongCounter } = {};

export const internal = {
    current: Math.random(),
    graceId: undefined,
    gracePeriod: 1e4, // 10 seconds
    is( envcode : number ) { return envcode && ( envcode === this.current || envcode === this.previous ) },
    previous: undefined,
    ttl: 1.08e7, // 3 hour cycle
    unwatch() {
        global.clearTimeout( this.graceId );
        global.clearInterval( this.watchId );
        this.graceId = this.watchId = undefined;
    },
    watch() {
        if( this.watchId ) { throw new TypeError( 'Cannot begin new watch at this time. An exisitng watch is currently underway. Use the `unwatch()` method to disable it in order to begin a new watch.' ) }
        const _this = this;
        this.watchId = $global.setInterval(() => {
            _this.previous = _this.current;
            _this.current = Math.random();
            _this.graceId = $global.setTimeout( () => {
                _this.graceId = _this.previous = undefined;
            }, this.gracePeriod );
        }, this.ttl );
    },
    watchId: undefined
};
internal.watch();

export class LongCounter extends TimerObservable {
    #id : number;
    #timer : Timer;
    constructor( timer : Timer ) {
        super();
        this.#timer = timer;
        this.#id = ++counter;
        longCounterMap[ this.#id ] = this;
    }
    get expired() { return this.#timer === undefined };
    get id() { return this.#id }
    get timeRemaining() { return this.#timer?.currentWaitTime }
    protected set timer( timer ) { this.#timer = timer }
    addEventListener( eventType : EventType, listener : VoidFn ) {
        this.#timer &&
        this.observers[ eventType ].add( listener ) &&
        this.#timer.addEventListener( eventType, listener );
    }
    cancel() {
        delete longCounterMap[ this.id ];
        if( !this.#timer ) { return }
        if( this.#timer.disposed ) {
            this.#timer = undefined;
            return;
        }
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
        if( !internal.is( internalCode ) ) {
            throw new SyntaxError( `Following operation cannot be completed using the following code: ${ internalCode }.` );
        }
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

/** @param longCounter - LongCounter instance or LongCounter.id property value */
const endLongCount = <T extends number | LongCounter>( longCounter : T ) => ( (
    typeof longCounter === 'number'
        ? longCounterMap[ longCounter ]
        : longCounter
) as LongCounter )?.cancel();

/** @param longCounter - LongCounter instance or LongCounter.id property value */
export const clearInterval = endLongCount;

/** @param longCounter - LongCounter instance or LongCounter.id property value */
export const clearTimeout = endLongCount;

/** @param options - Options object or Options.immediate property value  */
const resolveTimerOptions = <T extends boolean | Opts>( options : T ) : Opts => (
    typeof options === 'boolean' ? { immediate: options } : options
);

/** @param options - Options.immediate property value  */
export function setInterval( fn : VoidFn, delay? : Delay, options? : boolean, ...args : Array<any> ) : Interval;
/** @param options - Options object */
export function setInterval( fn : VoidFn, delay? : Delay, options? : Opts, ...args : Array<any> ) : Interval;
/** @param options - Options object or Options.immediate property value  */
export function setInterval( fn : VoidFn, delay : Delay = undefined, options : boolean | Opts = false , ...args : Array<any> ) {
    const tOptions = resolveTimerOptions( options );
    const interval = new Interval( new Timer( fn, delay, tOptions, ...args ) );
    interval.addEventListener( 'exit', () => interval.updateTimer(
        new Timer( fn, delay, { ...tOptions, immediate : false }, ...args ),
        internal.current
    ) );
    return interval;
};

/** @param options - Options.immediate property value  */
export function setTimeout( fn : VoidFn, delay? : Delay, options? : boolean, ...args : Array<any> ) : LongCounter;
/** @param options - Options object */
export function setTimeout( fn : VoidFn, delay? : Delay, options? : Opts, ...args : Array<any> ) : LongCounter;
/** @param options - Options object or Options.immediate property value  */
export function setTimeout( fn : VoidFn, delay : Delay = undefined, options : boolean | Opts = false, ...args : Array<any> ) {
    const counter = new LongCounter( new Timer( fn, delay, resolveTimerOptions( options ), ...args ) );
    counter.addEventListener( 'exit', counter.cancel.bind( counter ) );
    return counter;
};

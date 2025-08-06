import type {
    Delay,
    EventName,
    EventType,
    Options,
    VoidFn 
} from './index';

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
        $global.clearTimeout( this.graceId );
        $global.clearInterval( this.watchId );
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
    private _id : number;
    private _timer : Timer;
    constructor( timer : Timer ) {
        super();
        this._timer = timer;
        this._id = ++counter;
        longCounterMap[ this._id ] = this;
    }
    get expired() { return this._timer === undefined };
    get id() { return this._id }
    get timeRemaining() { return this._timer?.currentWaitTime }
    protected set timer( timer ) { this._timer = timer }
    addEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void;
    addEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void;
    addEventListener( eventType, listener ) : void {
        this._timer &&
        this._observers[ eventType ].add( listener ) &&
        this._timer.addEventListener( eventType, listener );
    }
    cancel() {
        delete longCounterMap[ this.id ];
        if( !this._timer ) { return }
        if( this._timer.disposed ) {
            this._timer = undefined;
            return;
        }
        // preempts exit listeners
        for( let listener of this._observers.exit ) {
            this._timer.removeEventListener( 'exit', listener );
        }
        this._timer.exit();
        this._timer = undefined;
    }
    dispatchEvent<ARGS extends Array<any>>( eventType : EventType, ...args : ARGS ) : void;
    dispatchEvent<ARGS extends Array<any>>( eventType : EventName, ...args : ARGS ) : void;
    dispatchEvent( eventType, ...args ) : void {
        this._timer?.dispatchEvent( eventType, ...args );
    }
    removeEventListener<ARGS extends Array<any>>( eventType : EventType, listener : VoidFn<ARGS> ) : void;
    removeEventListener<ARGS extends Array<any>>( eventType : EventName, listener : VoidFn<ARGS> ) : void;
    removeEventListener( eventType, listener ) : void {
        this._timer &&
        this._observers[ eventType ].delete( listener ) &&
        this._timer.removeEventListener( eventType, listener );
    };
    valueOf() { return this.id }
}

export class Interval extends LongCounter {
    constructor( timer : Timer ) { super( timer ) }
    updateTimer ( timer : Timer, internalCode : number ) {
        if( !internal.is( internalCode ) ) {
            throw new SyntaxError( `Following operation cannot be completed using the following code: ${ internalCode }.` );
        }
        for( let [ eventType, listeners ] of Object.entries( this._observers ) ) {
            for( let listener of listeners ) {
                timer.addEventListener( eventType as EventName, listener );
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
export function setInterval<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay? : Delay, options? : boolean, ...args : ARGS ) : Interval;
/** @param options - Options.immediate property value  */
export function setInterval<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay? : Delay, options? : boolean, ...args : ARGS ) : Interval;
/** @param options - Options object */
export function setInterval<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay? : Delay, options? : Opts, ...args : ARGS ) : Interval;
/** @param options - Options object or Options.immediate property value  */
export function setInterval<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay : Delay = undefined, options : boolean | Opts = false , ...args : ARGS ) {
    const tOptions = resolveTimerOptions( options );
    const interval = new Interval( new Timer( fn, delay, tOptions, ...args ) );
    interval.addEventListener( 'exit', () => interval.updateTimer(
        new Timer( fn, delay, { ...tOptions, immediate : false }, ...args ),
        internal.current
    ) );
    return interval;
};

/** @param options - Options.immediate property value  */
export function setTimeout<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay? : Delay, options? : boolean, ...args : ARGS ) : LongCounter;
/** @param options - Options object */
export function setTimeout<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay? : Delay, options? : Opts, ...args : ARGS ) : LongCounter;
/** @param options - Options object or Options.immediate property value  */
export function setTimeout<ARGS extends Array<unknown>>( fn : VoidFn<ARGS>, delay : Delay = undefined, options : boolean | Opts = false, ...args : ARGS ) {
    const counter = new LongCounter( new Timer( fn, delay, resolveTimerOptions( options ), ...args ) );
    counter.addEventListener( 'exit', counter.cancel.bind( counter ) );
    return counter;
};

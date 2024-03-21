/* ------------------------------
/* 
/* Accept:
/* Integer Number
/* "Large integer" string or any integer
/* BigInt
/* Iterable<single digit integers>
/*
/* ------------------------------
/* 
/* - ignore negative numbers, string staring with "-", 
/* 
/* Impl:
/* if( input is less than 10,000 or 1e4 or "10,000" or "1e4") {
/* 	use simple setTimeout or setInterval
/* }
/* if( large string integers <= Integer Number Infinity & >= 0 ) {
/* 	convert to regular integer
/* }
/* 
/* Maintaining countdown consistency in browser sleep/wake:
/* 1. Always capture the time of setTimeout/setInterval invocation for an iteration in "refreshTime" (this is the start of the current iteration)
/* Listen for document.onVisibilityChange event
/* 	if( document.visibilityState !== 'visible' ) {
/* 		capture current timeout/interval elapsed = Date.now() - $refreshTime in 					"elapsedTime"
/* 		and capture current iteration timeout/interval pending = this iteration delay 				total duration - $elapsedTime in "remainingTime"
/* 		return;
/* 	}
/* 	capture time spent in sleep = Date.now() - $remainingTime in "idlePhaseTime"
/* 	if( $idlePhaseTime > 0 {
/* 		clear current timeout/interval
/* 		capture new timeout/interval with $idePhaseTime delay into 						`timer.current`
/* 		return;
/* 	}
/* 	capture total remaining delay = ($remainingTime + total untouched delay 				time) - $idlePhasetTime into "totalRemainingTime"
/* 		if( $totalRemaingTime <= 0 ) {
/* 			clear current timeout/interval
/* 			invoke timer callback
/* 			set $timer.current and other pertinent properties to undefined
/* 			return
/* 		}
/* 		set total untouched delay time to $totalTimeRemaining start a new iteration
/* 		-  capture timeout/interval afresh with the callback into $timer.current
/* 		-  capture the time of setTimeout/setInterval invocation for an iteration in 				"refreshTime"
/* 		-  do all other captures as t.b.d.
/* 	}
/* }
/* 
*/

import type { Args, Delay, Options, VoidFn } from './types';

import { $global } from './$global';

import TimerObservable from './observable/index';

import Timer from './timer/index';

export type Opts = Partial<Options>;

let counter = 0;

const longCounterMap : {[counterId:number]: LongCounter} = {};

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
    addEventListener( eventType, listener ) {
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
    dispatchEvent( eventType, ...args ) {
        return this.#timer?.dispatchEvent( eventType, ...args );
    }
    removeEventListener( eventType, listener ) {
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
                timer.addEventListener( eventType, listener );
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

export function setInterval<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay? : Delay, option? : boolean, ...args : HANDLER_ARGS ) : LongCounter;
export function setInterval<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay? : Delay, option? : Opts, ...args : HANDLER_ARGS ) : LongCounter;
export function setInterval<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay : Delay = undefined, options : boolean|Opts = false , ...args : HANDLER_ARGS ) {
    const tOptions = resolveTimerOptions( options );
    const interval = new Interval( new Timer( fn, delay, tOptions, ...args ) );
    interval.addEventListener( 'exit', () => interval.updateTimer(
        new Timer( fn, delay, { ...tOptions, immediate : false }, ...args ),
        internalCode
    ) );
    return interval;
};

export function setTimeout<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay? : Delay, options? : boolean, ...args : HANDLER_ARGS ) : LongCounter;
export function setTimeout<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay? : Delay, options? : Opts, ...args : HANDLER_ARGS ) : LongCounter;
export function setTimeout<HANDLER_ARGS extends Args = Args>( fn : VoidFn, delay : Delay = undefined, options : any = false, ...args : HANDLER_ARGS ) {
    const counter = new LongCounter( new Timer( fn, delay, resolveTimerOptions( options ), ...args ) );
    counter.addEventListener( 'exit', counter.cancel.bind( counter ) );
    return counter;
};

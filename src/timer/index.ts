import type { Delay, EventType, MyInteger, Options, VoidFn } from '../index';

import { EMPTY_ARRAY, EMPTY_OBJECT, MAX_SET_TIMEOUT_DELAY } from '../constants';

import { $global } from '../$global';

import { getTypeOf, noop } from '../util/index';

import { add, isGreaterThan, subtract } from '../util/int-xl/index';

import { sanitizeDelay } from './helpers/index';

import invoke from './helpers/decorators/invoke';

import TimerObservable from '../observable/index';

class Timer extends TimerObservable {
    #continuityWatch : VoidFn;
    #currentIterDuration : number;
    #suspendedAt : number = undefined; // in ms set if current iteration has gone into sleep mode
    #cycleStart : number; // the time of the current count iteration start
    #handler : VoidFn;
    #disposed = false;
    #numCycles = 0; // global settimeout invocations currently made in the life of this timer.
    #maxIterDuration : number;
    #payload : Array<any>;
    #timeoutId : NodeJS.Timeout|string|number|undefined;
    #totalUntouchedDelay : MyInteger|undefined;
    constructor(
        fn: VoidFn,
        delay: Delay = 0,
        options : Options = EMPTY_OBJECT,
        ...args : Array<any>
    ) {
        super();
        this.#handler = fn;
        this.#maxIterDuration =  options.maxTimeoutDelay ?? MAX_SET_TIMEOUT_DELAY;
        // istanbul ignore next
        this.#payload = args || EMPTY_ARRAY;
        this.#totalUntouchedDelay = sanitizeDelay( delay );
        this.persist();
        this.beginIteration();
        options.immediate && this.execute();
    } 
    get continuityWatch () { return this.#continuityWatch }
    // time spent in current iteration
    // istanbul ignore next
    get currentIterElaspedTime () { return !this.#cycleStart ? 0 : Date.now() - this.#cycleStart }
    get currentWaitTime () {
        if( !this.#cycleStart ) { return 0 }
        const iterRemaining = this.#currentIterDuration - this.currentIterElaspedTime;
        return this.#totalUntouchedDelay
            ?  add( iterRemaining, this.#totalUntouchedDelay )
            : iterRemaining;
    }
    get disposed () { return this.#disposed }
    @invoke
    beginIteration() {
        switch( getTypeOf( this.#totalUntouchedDelay ) ) {
            case 'Number': {
                const delay = this.#totalUntouchedDelay as number;
                if( delay <= this.#maxIterDuration ) {
                    this.#currentIterDuration = delay;
                    this.#totalUntouchedDelay = undefined;
                    break;
                }
                this.#currentIterDuration = this.#maxIterDuration;
                this.#totalUntouchedDelay = delay - this.#maxIterDuration;
                break;
            }
            case 'Uint8Array': {
                this.#totalUntouchedDelay = subtract(
                    this.#totalUntouchedDelay,
                    this.#maxIterDuration
                );
                this.#currentIterDuration = this.#maxIterDuration;
                break;
            }
            // istanbul ignore next
            default: return this.exit();
        }
        this.setTimeout();
    }    
    clearTimeout() {
        if( typeof this.#timeoutId === 'undefined' ) { return }
        $global.clearTimeout( this.#timeoutId as number );
        this.#timeoutId = undefined;
    }
    endIteration() {
        this.clearTimeout();
        if( !this.#totalUntouchedDelay ) {
            this.execute();
            this.notifyCycleEnd( true );
            return this.exit();
        }
        this.notifyCycleEnd();
        this.beginIteration();
    }
    @invoke
    execute() { this.#handler( ...this.#payload ) }
    exit() {
        this.clearTimeout();
        this.#continuityWatch && $global.document.removeEventListener( 'visibilitychange', this.#continuityWatch );
        this.dispatchEvent( 'exit', { timeRemaining: this.currentWaitTime } );
        this.#continuityWatch = this.#cycleStart = this.#handler = this.#payload = this.#totalUntouchedDelay = undefined;
        this.#currentIterDuration = 0;
        for( let k in this.observers ) {
            this.observers[ k as EventType ].clear();
        }
        this.#disposed = true;
    }
    @invoke
    notifyCycleEnd( isFinal = false ) {
        this.dispatchEvent( 'cycleEnding', {
            currentCycle: this.#numCycles,
            isFinal,
            time: Date.now()
        } );
    }
    @invoke
    notifyResume() {
        this.dispatchEvent( 'resume', { timeRemaining: this.currentWaitTime } );
    }
    @invoke
    onContinuityChange() {
        switch( $global.document.visibilityState ) {
            case 'hidden': return this.suspend();
            case 'visible': return this.resume();
        }
    }
    persist() {
        if( $global.document.addEventListener === noop ) {
            return $global.console.warn( 'Cannot conduct long count with this machine. The Global document property with `addEventListener` method not supported.' );
        }
        this.#continuityWatch = () => this.onContinuityChange();
        $global.document.addEventListener( 'visibilitychange', this.#continuityWatch );
    }
    @invoke
    resume() {
        const sleepDuration =  Date.now() - this.#suspendedAt;
        const preSleepIterRemaining = this.#currentIterDuration - ( this.#suspendedAt - this.#cycleStart );
        const postIterSleepLength =  sleepDuration - preSleepIterRemaining;
        /* did not completely sleep through the iteration */
        if( postIterSleepLength <= 0  ) {
            this.#currentIterDuration = Math.abs( postIterSleepLength );
            this.notifyResume();
            return this.setTimeout();
        }
        /* slept through the entire timer delay */
        if( !this.#totalUntouchedDelay || isGreaterThan(
            postIterSleepLength, this.#totalUntouchedDelay
        ) ) {
            this.#cycleStart = undefined;
            this.notifyResume();
            this.execute();
            return this.exit();
        }
        /* slept through at least the current
        iteration but not the entire timer delay */
        this.#totalUntouchedDelay = subtract(
            this.#totalUntouchedDelay,
            Date.now() - this.#cycleStart
        );
        this.notifyResume();
        this.beginIteration();
    }
    setTimeout() {
        // istanbul ignore next
        this.#timeoutId && console.info( 'overriding current active timer' );
        this.#timeoutId = $global.setTimeout(
            () => this.endIteration(),
            this.#currentIterDuration - 10 // 10 ms error margin to account for record keeping and other call preparation
        );
        const isInit = !this.#cycleStart;
        this.#cycleStart = Date.now();
        this.dispatchEvent( 'cycleStarted', {
            currentCycle: ++this.#numCycles,
            isInit,
            time: this.#cycleStart
        } );
    }
    @invoke
    suspend() {
        // istanbul ignore next
        if( !this.#cycleStart ) { return }
        this.#suspendedAt = Date.now();
        this.clearTimeout();
        this.dispatchEvent( 'suspend', { timeRemaining: this.currentWaitTime } );
    }
}

export default Timer;

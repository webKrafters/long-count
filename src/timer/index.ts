import type { Delay, MyInteger, Options, VoidFn } from '../types';

import { EMPTY_OBJECT, MAX_SET_TIMEOUT_DELAY } from '../constants';

import { $global } from '../$global';

import { getTypeName, noop } from '../util/index';

import { add, subtract } from '../util/int-xl/index';

import { sanitizeDelay } from './helpers/index';

import TimerObservable from '../observable/index';

class Timer extends TimerObservable {
    #continuityWatch : VoidFn;
    #currentIterDuration : number;
    #currentIterLengthSuspended = 0; // current iteration duration remaining at suspension
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
        ...args: Array<any>
    ) {
        super();
        this.#handler = fn;
        this.#maxIterDuration =  options.maxTimeoutDelay ?? MAX_SET_TIMEOUT_DELAY;
        this.#payload = args;
        this.#totalUntouchedDelay = sanitizeDelay( delay );
        this.persist();
        this.beginIteration();
        options.immediate && this.execute();
    } 
    get continuityWatch () { return this.#continuityWatch }
    // time spent in current iteration
    get currentIterElaspedTime () { return Date.now() - this.#cycleStart }
    get currentWaitTime () {
        return typeof this.#cycleStart === 'undefined'
            ? this.#totalUntouchedDelay
            : add(
                this.#currentIterDuration - this.currentIterElaspedTime,
                this.#totalUntouchedDelay
            );
    }
    get disposed () { return this.#disposed }
    beginIteration() {
        switch( getTypeName( this.#totalUntouchedDelay ) ) {
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
            this.notifCycleEnd( true );
            return this.exit();
        }
        this.notifCycleEnd();
        this.beginIteration();
    }
    execute() { this.#handler( ...this.#payload ) }
    exit() {
        this.clearTimeout();
        this.#continuityWatch && $global.document.removeEventListener( 'visibilitychange', this.#continuityWatch );
        this.dispatchEvent( 'exit', { timeRemaining: this.currentWaitTime } );
        this.#handler = this.#payload = this.#totalUntouchedDelay = this.#continuityWatch = undefined;
        this.#disposed = true;
    }
    notifCycleEnd( isFinal = false ) {
        this.dispatchEvent( 'cycleEnding', {
            currentCycle: this.#numCycles,
            isFinal,
            time: Date.now()
        } );
    }
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
    resume() {
        if( this.#currentIterLengthSuspended < 0 ) { return this.beginIteration() }
        const rollover = this.#currentIterLengthSuspended - Date.now();
        this.#currentIterLengthSuspended = 0;
        if( rollover < 0 ) { return this.beginIteration() }
        this.#currentIterDuration = rollover;
        rollover > 0 ? this.endIteration() : this.setTimeout();
        return this.dispatchEvent( 'resume', { timeRemaining: this.currentWaitTime } );
    }
    setTimeout() {
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
    suspend() {
        if( typeof this.#cycleStart === 'undefined' ) { return }
        this.#currentIterLengthSuspended = this.#currentIterDuration - this.currentIterElaspedTime;
        this.clearTimeout();
        this.dispatchEvent( 'suspend', { timeRemaining: this.currentWaitTime } );
    }
}

export default Timer;
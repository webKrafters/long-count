import type { Args, Delay, MyInteger, Options, VoidFn } from '../types';

import { EMPTY_OBJECT, MAX_ITER_DURATION } from '../constants';

import { $global } from '../$global';

import { getTypeName, noop } from '../util/index';

import { add, subtract } from '../util/long-int/index';

import { sanitizeDelay } from './helpers/index';

import TimerObservable from '../observable/index';

class Timer <HANDLER_ARGS extends Args = Args> extends TimerObservable {
    #continuityWatch : VoidFn;
    #currentIterDuration : number;
    #currentIterLengthSuspended : number = 0; // current iteration duration remaining at suspension
    #handler : VoidFn;
    #disposed = false;
    #maxIterDuration : number;
    #payload : HANDLER_ARGS;
    #refreshTime : number; // the time of the current count iteration start
    #timeoutId : NodeJS.Timeout|string|number|undefined;
    #totalUntouchedDelay : MyInteger|undefined;
    constructor(
        fn: VoidFn,
        delay: Delay = 0,
        options : Options = EMPTY_OBJECT,
        ...args: HANDLER_ARGS
    ) {
        super();
        this.#handler = fn;
        this.#maxIterDuration =  options.maxTimeoutDelay ?? MAX_ITER_DURATION;
        this.#payload = args;
        this.#totalUntouchedDelay = sanitizeDelay( delay );
        this.persist();
        this.beginIteration();
        options.immediate && this.execute();
    } 
    get continuityWatch () { return this.#continuityWatch }
    // time spent in current iteration
    get currentIterElaspedTime () { return Date.now() - this.#refreshTime }
    get currentWaitTime () {
        return typeof this.#refreshTime === 'undefined'
            ? this.#totalUntouchedDelay
            : add(
                this.#currentIterDuration - this.currentIterElaspedTime,
                this.#totalUntouchedDelay
            );
    }
    get disposed () { return this.#disposed }
    beginIteration() {
        this.#refreshTime = Date.now();
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
            return this.exit();
        }
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
        this.#refreshTime = Date.now();
        const rollover = this.#currentIterLengthSuspended - this.#refreshTime;
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
    }
    suspend() {
        if( typeof this.#refreshTime === 'undefined' ) { return }
        this.#currentIterLengthSuspended = this.#currentIterDuration - this.currentIterElaspedTime;
        this.clearTimeout();
        this.dispatchEvent( 'suspend', { timeRemaining: this.currentWaitTime } );
    }
}

export default Timer;
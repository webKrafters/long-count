import type {
    Delay,
    EventName,
    MyInteger,
    Options,
    VoidFn
} from '../index';

import {
    EMPTY_ARRAY,
    EMPTY_OBJECT,
    MAX_SET_TIMEOUT_DELAY
} from '../constants';

import { $global } from '../$global';

import { getTypeOf, noop } from '../util/index';

import {
    add,
    isGreaterThan,
    subtract
} from '../util/int-xl/index';

import { sanitizeDelay } from './helpers/index';

import invoke from './helpers/decorators/invoke';

import TimerObservable from '../observable/index';

class Timer<ARGS extends Array<any> = Array<any>> extends TimerObservable {
    private _continuityWatch : VoidFn;
    private _currentIterDuration : number;
    private _suspendedAt : number; // in ms set if current iteration has gone into sleep mode
    private _cycleStart : number; // the time of the current count iteration start
    private _handler : VoidFn<ARGS>;
    private _disposed = false;
    private _numCycles = 0; // global settimeout invocations currently made in the life of this timer.
    private _maxIterDuration : number;
    private _payload : ARGS;
    private _timeoutId : NodeJS.Timeout|string|number|undefined;
    private _totalUntouchedDelay : MyInteger|undefined;
    constructor(
        fn: VoidFn<ARGS>,
        delay: Delay = 0,
        options : Options = EMPTY_OBJECT,
        ...args : ARGS
    ) {
        super();
        this._handler = fn;
        this._maxIterDuration =  options.maxTimeoutDelay ?? MAX_SET_TIMEOUT_DELAY;
        // istanbul ignore next
        this._payload = args || EMPTY_ARRAY as ARGS;
        this._totalUntouchedDelay = sanitizeDelay( delay );
        this.persist();
        this.beginIteration();
        options.immediate && this.execute();
    } 
    get continuityWatch () { return this._continuityWatch }
    // time spent in current iteration
    // istanbul ignore next
    get currentIterElaspedTime () { return !this._cycleStart ? 0 : Date.now() - this._cycleStart }
    get currentWaitTime () {
        if( !this._cycleStart ) { return 0 }
        const iterRemaining = this._currentIterDuration - this.currentIterElaspedTime;
        return this._totalUntouchedDelay
            ?  add( iterRemaining, this._totalUntouchedDelay )
            : iterRemaining;
    }
    get disposed () { return this._disposed }
    @invoke
    beginIteration() {
        switch( getTypeOf( this._totalUntouchedDelay ) ) {
            case 'Number': {
                const delay = this._totalUntouchedDelay as number;
                if( delay <= this._maxIterDuration ) {
                    this._currentIterDuration = delay;
                    this._totalUntouchedDelay = undefined;
                    break;
                }
                this._currentIterDuration = this._maxIterDuration;
                this._totalUntouchedDelay = delay - this._maxIterDuration;
                break;
            }
            case 'Uint8Array': {
                this._totalUntouchedDelay = subtract(
                    this._totalUntouchedDelay,
                    this._maxIterDuration
                );
                this._currentIterDuration = this._maxIterDuration;
                break;
            }
            // istanbul ignore next
            default: return this.exit();
        }
        this.setTimeout();
    }    
    clearTimeout() {
        if( typeof this._timeoutId === 'undefined' ) { return }
        $global.clearTimeout( this._timeoutId as number );
        this._timeoutId = undefined;
    }
    endIteration() {
        this.clearTimeout();
        if( !this._totalUntouchedDelay ) {
            this.execute();
            this.notifyCycleEnd( true );
            return this.exit();
        }
        this.notifyCycleEnd();
        this.beginIteration();
    }
    @invoke
    execute() { this._handler( ...this._payload ) }
    exit() {
        this.clearTimeout();
        this._continuityWatch && $global.document.removeEventListener( 'visibilitychange', this._continuityWatch );
        this.dispatchEvent( 'exit', { timeRemaining: this.currentWaitTime } );
        this._continuityWatch = this._cycleStart = this._handler = this._payload = this._totalUntouchedDelay = undefined;
        this._currentIterDuration = 0;
        for( let k in this._observers ) {
            this._observers[ k as EventName ].clear();
        }
        this._disposed = true;
    }
    @invoke
    notifyCycleEnd( isFinal = false ) {
        this.dispatchEvent( 'cycleEnding', {
            currentCycle: this._numCycles,
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
        this._continuityWatch = () => this.onContinuityChange();
        $global.document.addEventListener( 'visibilitychange', this._continuityWatch );
    }
    @invoke
    resume() {
        const sleepDuration =  Date.now() - this._suspendedAt;
        const preSleepIterRemaining = this._currentIterDuration - ( this._suspendedAt - this._cycleStart );
        const postIterSleepLength =  sleepDuration - preSleepIterRemaining;
        /* did not completely sleep through the iteration */
        if( postIterSleepLength <= 0  ) {
            this._currentIterDuration = Math.abs( postIterSleepLength );
            this.notifyResume();
            return this.setTimeout();
        }
        /* slept through the entire timer delay */
        if( !this._totalUntouchedDelay || isGreaterThan(
            postIterSleepLength, this._totalUntouchedDelay
        ) ) {
            this._cycleStart = undefined;
            this.notifyResume();
            this.execute();
            return this.exit();
        }
        /* slept through at least the current
        iteration but not the entire timer delay */
        this._totalUntouchedDelay = subtract(
            this._totalUntouchedDelay,
            Date.now() - this._cycleStart
        );
        this.notifyResume();
        this.beginIteration();
    }
    setTimeout() {
        // istanbul ignore next
        this._timeoutId && console.info( 'overriding current active timer' );
        this._timeoutId = $global.setTimeout(
            () => this.endIteration(),
            this._currentIterDuration - 10 // 10 ms error margin to account for record keeping and other call preparation
        );
        const isInit = !this._cycleStart;
        this._cycleStart = Date.now();
        this.dispatchEvent( 'cycleStarted', {
            currentCycle: ++this._numCycles,
            isInit,
            time: this._cycleStart
        } );
    }
    @invoke
    suspend() {
        // istanbul ignore next
        if( !this._cycleStart ) { return }
        this._suspendedAt = Date.now();
        this.clearTimeout();
        this.dispatchEvent( 'suspend', { timeRemaining: this.currentWaitTime } );
    }
}

export default Timer;

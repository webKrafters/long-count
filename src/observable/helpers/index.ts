import type { ObserverMap } from '../../index';

export const getDefaultObserverMap = () : ObserverMap => ({
    cycleEnding: new Set(),
    cycleStarted: new Set(),
    exit: new Set(),
    resume: new Set(),
    suspend: new Set()
});
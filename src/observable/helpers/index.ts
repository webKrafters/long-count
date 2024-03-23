import type { ObserverMap } from '../../types';

export const getDefaultObserverMap = () : ObserverMap => ({
    cycleEnding: new Set(),
    cycleStarted: new Set(),
    exit: new Set(),
    resume: new Set(),
    suspend: new Set()
});
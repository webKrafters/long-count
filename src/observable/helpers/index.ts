import type { ObserverMap } from '../../types';

export const getDefaultObserverMap = () : ObserverMap => ({
    exit: new Set(),
    resume: new Set(),
    suspend: new Set()
});
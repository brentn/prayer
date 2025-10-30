import { ActionReducer, INIT, MetaReducer } from '@ngrx/store';
import { RootState } from '../index';
import { initialListsState } from '../lists/list.reducer';
import { initialTopicsState } from '../topics/topic.reducer';
import { initialRequestsState } from '../requests/request.reducer';

const STORAGE_KEY = 'prayer_app_state_v1';

export function loadInitialState(): Partial<RootState> | undefined {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        // Minimal validation
        if (typeof parsed !== 'object') return undefined;
        return parsed as Partial<RootState>;
    } catch {
        return undefined;
    }
}

export function storageMetaReducer(reducer: ActionReducer<RootState>): ActionReducer<RootState> {
    return function (state, action) {
        const nextState = reducer(state, action);
        // Persist after INIT and any other action
        try {
            const snapshot: Partial<RootState> = {
                lists: nextState?.lists ?? initialListsState,
                topics: nextState?.topics ?? initialTopicsState,
                requests: nextState?.requests ?? initialRequestsState,
            } as Partial<RootState>;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
            // ignore storage errors
        }
        return nextState;
    } as ActionReducer<RootState>;
}

import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import * as RequestActions from './request.actions';

export const requestsFeatureKey = 'requests';

export interface RequestEntity {
    id: number;
    description: string;
    createdDate: string; // ISO string for storage simplicity
    answeredDate?: string | null;
    prayerCount: number;
    priority: number; // 1 (low) to 5 (high)
}

export type RequestsState = EntityState<RequestEntity>;

export const adapter = createEntityAdapter<RequestEntity>();

export const initialRequestsState: RequestsState = adapter.getInitialState();

function nextId(state: RequestsState): number {
    const ids = state.ids as number[];
    return ids.length ? Math.max(...ids) + 1 : 1;
}

export const reducer = createReducer(
    initialRequestsState,
    on(RequestActions.addRequest, (state, { description }) => {
        const id = nextId(state);
        const now = new Date().toISOString();
        return adapter.addOne({ id, description, createdDate: now, answeredDate: null, prayerCount: 0, priority: 1 }, state);
    }),
    on(RequestActions.addRequestWithId, (state, { id, description }) => {
        const now = new Date().toISOString();
        return adapter.addOne({ id, description, createdDate: now, answeredDate: null, prayerCount: 0, priority: 1 }, state);
    }),
    on(RequestActions.updateRequest, (state, { id, changes }) => adapter.updateOne({ id, changes }, state)),
    on(RequestActions.removeRequest, (state, { id }) => adapter.removeOne(id, state)),
    on(RequestActions.clearRequests, state => adapter.removeAll(state)),
);

export const requestsFeature = createFeature({
    name: requestsFeatureKey,
    reducer,
});

export const { name: featureName, reducer: requestsReducer, selectRequestsState } = requestsFeature;
export const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors();

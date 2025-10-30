import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import * as ListActions from './list.actions';

export const listsFeatureKey = 'lists';

export interface ListEntity {
    id: number;
    name: string;
    topicIds: number[];
}

export type ListsState = EntityState<ListEntity>;

export const adapter = createEntityAdapter<ListEntity>();

export const initialListsState: ListsState = adapter.getInitialState();

function nextId(state: ListsState): number {
    const ids = state.ids as number[];
    return ids.length ? Math.max(...ids) + 1 : 1;
}

export const reducer = createReducer(
    initialListsState,
    on(ListActions.addList, (state, { name }) => {
        const id = nextId(state);
        return adapter.addOne({ id, name, topicIds: [] }, state);
    }),
    on(ListActions.updateList, (state, { id, changes }) => adapter.updateOne({ id, changes }, state)),
    on(ListActions.removeList, (state, { id }) => adapter.removeOne(id, state)),
    on(ListActions.clearLists, state => adapter.removeAll(state)),
);

export const listsFeature = createFeature({
    name: listsFeatureKey,
    reducer,
});

export const { name: featureName, reducer: listsReducer, selectListsState } = listsFeature;
export const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors();

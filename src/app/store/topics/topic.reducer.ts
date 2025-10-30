import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import * as TopicActions from './topic.actions';

export const topicsFeatureKey = 'topics';

export interface TopicEntity {
    id: number;
    name: string;
    requestIds: number[];
}

export type TopicsState = EntityState<TopicEntity>;

export const adapter = createEntityAdapter<TopicEntity>();

export const initialTopicsState: TopicsState = adapter.getInitialState();

function nextId(state: TopicsState): number {
    const ids = state.ids as number[];
    return ids.length ? Math.max(...ids) + 1 : 1;
}

export const reducer = createReducer(
    initialTopicsState,
    on(TopicActions.addTopic, (state, { name }) => {
        const id = nextId(state);
        return adapter.addOne({ id, name, requestIds: [] }, state);
    }),
    on(TopicActions.addTopicWithId, (state, { id, name }) => {
        return adapter.addOne({ id, name, requestIds: [] }, state);
    }),
    on(TopicActions.updateTopic, (state, { id, changes }) => adapter.updateOne({ id, changes }, state)),
    on(TopicActions.removeTopic, (state, { id }) => adapter.removeOne(id, state)),
    on(TopicActions.clearTopics, state => adapter.removeAll(state)),
);

export const topicsFeature = createFeature({
    name: topicsFeatureKey,
    reducer,
});

export const { name: featureName, reducer: topicsReducer, selectTopicsState } = topicsFeature;
export const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors();

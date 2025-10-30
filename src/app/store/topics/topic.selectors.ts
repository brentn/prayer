import { adapter } from './topic.reducer';
import { createSelector } from '@ngrx/store';
import { selectTopicsState } from './topic.reducer';

const selectors = adapter.getSelectors(selectTopicsState);

export const selectAllTopics = selectors.selectAll;
export const selectTopicEntities = selectors.selectEntities;
export const selectTopicTotal = selectors.selectTotal;

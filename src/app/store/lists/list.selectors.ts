import { createSelector } from '@ngrx/store';
import { selectListsState } from './list.reducer';
import { adapter } from './list.reducer';

const selectors = adapter.getSelectors(selectListsState);

export const selectAllLists = selectors.selectAll;
export const selectListEntities = selectors.selectEntities;
export const selectListTotal = selectors.selectTotal;

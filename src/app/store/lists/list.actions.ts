import { createAction, props } from '@ngrx/store';

export const addList = createAction('[Lists] Add', props<{ name: string }>());
export const updateList = createAction('[Lists] Update', props<{ id: number; changes: { name?: string; topicIds?: number[] } }>());
export const removeList = createAction('[Lists] Remove', props<{ id: number }>());
export const clearLists = createAction('[Lists] Clear All');

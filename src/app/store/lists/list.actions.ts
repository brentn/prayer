import { createAction, props } from '@ngrx/store';

export const addList = createAction('[Lists] Add', props<{ name: string }>());
export const addListWithId = createAction('[Lists] Add With Id', props<{ id: number; name: string; topicIds?: number[]; excludeFromAll?: boolean }>());
export const updateList = createAction('[Lists] Update', props<{ id: number; changes: { name?: string; topicIds?: number[]; excludeFromAll?: boolean } }>());
export const removeList = createAction('[Lists] Remove', props<{ id: number }>());
export const clearLists = createAction('[Lists] Clear All');

import { createAction, props } from '@ngrx/store';

export const addTopic = createAction('[Topics] Add', props<{ name: string }>());
export const addTopicWithId = createAction('[Topics] Add With Id', props<{ id: number; name: string }>());
export const updateTopic = createAction('[Topics] Update', props<{ id: number; changes: { name?: string; requestIds?: number[] } }>());
export const removeTopic = createAction('[Topics] Remove', props<{ id: number }>());
export const clearTopics = createAction('[Topics] Clear All');

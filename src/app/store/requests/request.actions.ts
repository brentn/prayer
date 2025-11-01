import { createAction, props } from '@ngrx/store';

export const addRequest = createAction('[Requests] Add', props<{ description: string }>());
export const addRequestWithId = createAction('[Requests] Add With Id', props<{ id: number; description: string }>());
export const updateRequest = createAction('[Requests] Update', props<{ id: number; changes: { description?: string; createdDate?: string; answeredDate?: string | null; prayerCount?: number; priority?: number } }>());
export const removeRequest = createAction('[Requests] Remove', props<{ id: number }>());
export const clearRequests = createAction('[Requests] Clear All');

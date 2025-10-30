import { MetaReducer, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { listsReducer, ListsState } from './lists/list.reducer';
import { topicsReducer, TopicsState } from './topics/topic.reducer';
import { requestsReducer, RequestsState } from './requests/request.reducer';
import { storageMetaReducer, loadInitialState } from './meta/local-storage.metareducer';

export const metaReducers: MetaReducer[] = [storageMetaReducer];

export const provideAppStore = () => [
    provideStore(
        {
            lists: listsReducer,
            topics: topicsReducer,
            requests: requestsReducer,
        },
        {
            metaReducers,
            initialState: loadInitialState(),
        }
    ),
    provideEffects(),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
];

export interface RootState {
    lists: ListsState;
    topics: TopicsState;
    requests: RequestsState;
}

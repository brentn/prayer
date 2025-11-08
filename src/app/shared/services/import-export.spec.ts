import { TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';

import { ImportExportService } from './import-export';
import { listsReducer } from '../../store/lists/list.reducer';
import { topicsReducer } from '../../store/topics/topic.reducer';
import { requestsReducer } from '../../store/requests/request.reducer';

describe('ImportExportService', () => {
    let service: ImportExportService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideStore({
                    lists: listsReducer,
                    topics: topicsReducer,
                    requests: requestsReducer
                })
            ]
        });
        service = TestBed.inject(ImportExportService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});

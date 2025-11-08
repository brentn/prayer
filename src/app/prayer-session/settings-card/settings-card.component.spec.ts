import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';
import { signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { SettingsCardComponent } from './settings-slide.component';
import { listsReducer } from '../../store/lists/list.reducer';
import { topicsReducer } from '../../store/topics/topic.reducer';
import { requestsReducer } from '../../store/requests/request.reducer';
import { selectAllLists } from '../../store/lists/list.selectors';
import { selectAllTopics } from '../../store/topics/topic.selectors';
import { selectAllRequests } from '../../store/requests/request.selectors';
import { SettingsService } from '../../shared/services/settings.service';

describe('SettingsCardComponent', () => {
    let component: SettingsCardComponent;
    let fixture: ComponentFixture<SettingsCardComponent>;
    let mockSettingsService: jasmine.SpyObj<SettingsService>;

    const mockLists = [
        { id: 1, name: 'Test List', topicIds: [1, 2], excludeFromAll: false },
        { id: 2, name: 'Excluded List', topicIds: [3], excludeFromAll: true }
    ];

    const mockTopics = [
        { id: 1, name: 'Topic 1', requestIds: [1, 2] },
        { id: 2, name: 'Topic 2', requestIds: [] },
        { id: 3, name: 'Topic 3', requestIds: [3] }
    ];

    const mockRequests = [
        { id: 1, description: 'Request 1', priority: 2, prayerCount: 5, answeredDate: null, createdDate: '2025-01-01' },
        { id: 2, description: 'Request 2', priority: 1, prayerCount: 3, answeredDate: null, createdDate: '2025-01-02' },
        { id: 3, description: 'Answered Request', priority: 1, prayerCount: 10, answeredDate: '2025-11-01', answerDescription: 'Answered!', createdDate: '2025-01-03' }
    ];

    beforeEach(async () => {
        mockSettingsService = jasmine.createSpyObj('SettingsService', [
            'shuffleRequests', 'praySelectCount', 'setPraySelectCount', 'prayTimeValue', 'setPrayTimeValue', 'prayAnsweredCount', 'setPrayAnsweredCount'
        ], {
            shuffleRequests: signal(false),
            praySelectCount: signal(5),
            prayTimeValue: signal(60),
            prayAnsweredCount: signal(0)
        });

        // Create a mock store that returns signals with mock data
        const mockStore = jasmine.createSpyObj('Store', ['selectSignal', 'dispatch']);
        mockStore.selectSignal.and.callFake((selector: any) => {
            if (selector === selectAllLists) return signal(mockLists);
            if (selector === selectAllTopics) return signal(mockTopics);
            if (selector === selectAllRequests) return signal(mockRequests);
            return signal([]);
        });

        await TestBed.configureTestingModule({
            imports: [SettingsCardComponent],
            providers: [
                provideStore({
                    lists: listsReducer,
                    topics: topicsReducer,
                    requests: requestsReducer,
                }),
                { provide: Store, useValue: mockStore },
                { provide: SettingsService, useValue: mockSettingsService }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SettingsCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
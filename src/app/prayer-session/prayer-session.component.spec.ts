import { TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PrayerSessionComponent } from './prayer-session.component';
import { listsReducer } from '../store/lists/list.reducer';
import { topicsReducer } from '../store/topics/topic.reducer';
import { requestsReducer } from '../store/requests/request.reducer';

describe('PrayerSessionComponent', () => {
    it('should create', async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerSessionComponent, RouterTestingModule],
            providers: [
                provideNoopAnimations(),
                provideStore({
                    lists: listsReducer,
                    topics: topicsReducer,
                    requests: requestsReducer,
                })
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(PrayerSessionComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });
});

import { TestBed } from '@angular/core/testing';
import { ListComponent } from './list.component';
import { provideStore } from '@ngrx/store';
import { listsReducer } from '../../store/lists/list.reducer';
import { topicsReducer } from '../../store/topics/topic.reducer';
import { requestsReducer } from '../../store/requests/request.reducer';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

describe('ListComponent', () => {
    it('should create', async () => {
        await TestBed.configureTestingModule({
            imports: [ListComponent, RouterTestingModule],
            providers: [
                provideNoopAnimations(),
                provideStore({
                    lists: listsReducer,
                    topics: topicsReducer,
                    requests: requestsReducer,
                })
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(ListComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });
});

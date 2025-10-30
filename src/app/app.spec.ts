import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { listsReducer } from './store/lists/list.reducer';
import { topicsReducer } from './store/topics/topic.reducer';
import { requestsReducer } from './store/requests/request.reducer';
import { App } from './app';

describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideNoopAnimations(),
                provideStore({
                    lists: listsReducer,
                    topics: topicsReducer,
                    requests: requestsReducer,
                })
            ]
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render title', () => {
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h1')?.textContent).toContain('Prayer');
    });
});

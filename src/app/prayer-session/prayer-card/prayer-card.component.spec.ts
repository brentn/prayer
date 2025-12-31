import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PrayerCardComponent } from './prayer-card.component';

describe('PrayerCardComponent', () => {
    let component: PrayerCardComponent;
    let fixture: ComponentFixture<PrayerCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardComponent],
            providers: [
                provideNoopAnimations(),
                provideMockStore({
                    initialState: {
                        requests: { ids: [], entities: {} },
                        topics: { ids: [], entities: {} }
                    }
                })
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PrayerCardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display topic title', () => {
        component.item = { kind: 'topic' as const, id: 1, name: 'Healing' };
        fixture.detectChanges();
        expect(component.title).toBe('Healing');
    });

    it('should return empty string for non-topic items', () => {
        component.item = { kind: 'request' as const, id: 1, description: 'Test' };
        fixture.detectChanges();
        expect(component.title).toBe('');
    });
});

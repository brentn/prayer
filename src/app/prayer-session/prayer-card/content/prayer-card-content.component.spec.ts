import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PrayerCardContentComponent } from './prayer-card-content.component';

describe('PrayerCardContentComponent', () => {
    let component: PrayerCardContentComponent;
    let fixture: ComponentFixture<PrayerCardContentComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardContentComponent],
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

        fixture = TestBed.createComponent(PrayerCardContentComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the title', () => {
        component.title = 'Pray for healing';
        fixture.detectChanges();
        expect(component.title).toBe('Pray for healing');
    });
});

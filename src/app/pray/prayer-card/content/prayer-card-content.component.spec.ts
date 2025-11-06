import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrayerCardContentComponent } from './prayer-card-content.component';

describe('PrayerCardContentComponent', () => {
    let component: PrayerCardContentComponent;
    let fixture: ComponentFixture<PrayerCardContentComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardContentComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PrayerCardContentComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
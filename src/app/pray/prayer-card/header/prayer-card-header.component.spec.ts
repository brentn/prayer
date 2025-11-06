import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrayerCardHeaderComponent } from './prayer-card-header.component';

describe('PrayerCardHeaderComponent', () => {
    let component: PrayerCardHeaderComponent;
    let fixture: ComponentFixture<PrayerCardHeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardHeaderComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PrayerCardHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestComponent } from './request.component';

describe('RequestComponent', () => {
    let component: RequestComponent;
    let fixture: ComponentFixture<RequestComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RequestComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(RequestComponent);
        component = fixture.componentInstance;
        component.request = {
            id: 1,
            description: 'Test request',
            createdDate: '2025-01-01T00:00:00.000Z',
            priority: 1,
            prayerCount: 0
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
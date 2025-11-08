import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { ImportDialogComponent } from './import-dialog';

describe('ImportDialogComponent', () => {
    let component: ImportDialogComponent;
    let fixture: ComponentFixture<ImportDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<ImportDialogComponent>>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [ImportDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ImportDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

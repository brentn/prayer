import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChangeDetectorRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

export interface RequestEditDialogData {
    id: number;
    description: string;
    answeredDate?: string | null;
    priority?: number;
}

export type RequestEditDialogResult =
    | { action: 'save'; description: string; answered: boolean; priority: number }
    | { action: 'delete' }
    | { action: 'cancel' };

@Component({
    selector: 'app-request-edit-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSlideToggleModule,
    ],
    templateUrl: './request-edit-dialog.component.html',
    styleUrl: './request-edit-dialog.component.css',
})
export class RequestEditDialogComponent {
    description = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    answered = new FormControl(false, { nonNullable: true });
    priority = new FormControl(1, { nonNullable: true });

    constructor(
        private dialogRef: MatDialogRef<RequestEditDialogComponent, RequestEditDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: RequestEditDialogData,
        private cdr: ChangeDetectorRef,
    ) {
        this.description.setValue(data.description ?? '');
        this.answered.setValue(!!data.answeredDate);
        this.priority.setValue(data.priority ?? 1);
    }

    onCancel() {
        this.dialogRef.close({ action: 'cancel' });
    }

    onDelete() {
        this.dialogRef.close({ action: 'delete' });
    }

    onSave() {
        const desc = this.description.value.trim();
        if (!desc) return;
        this.dialogRef.close({ action: 'save', description: desc, answered: this.answered.value, priority: this.priority.value });
    }

    cyclePriority() {
        const current = this.priority.value;
        this.priority.setValue(current >= 5 ? 1 : current + 1);
        this.cdr.markForCheck();
    }
}

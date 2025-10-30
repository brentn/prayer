import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface RequestEditDialogData {
    id: number;
    description: string;
    answeredDate?: string | null;
}

export type RequestEditDialogResult =
    | { action: 'save'; description: string; answered: boolean }
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

    constructor(
        private dialogRef: MatDialogRef<RequestEditDialogComponent, RequestEditDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: RequestEditDialogData,
    ) {
        this.description.setValue(data.description ?? '');
        this.answered.setValue(!!data.answeredDate);
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
        this.dialogRef.close({ action: 'save', description: desc, answered: this.answered.value });
    }
}

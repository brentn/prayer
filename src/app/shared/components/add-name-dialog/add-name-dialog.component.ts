import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface AddNameDialogData {
    title: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
    initial?: string;
}

@Component({
    selector: 'app-add-name-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    templateUrl: './add-name-dialog.component.html',
    styleUrl: './add-name-dialog.component.css'
})
export class AddNameDialogComponent {
    value = new FormControl('', { nonNullable: true, validators: [Validators.required] });

    constructor(
        private dialogRef: MatDialogRef<AddNameDialogComponent, string>,
        @Inject(MAT_DIALOG_DATA) public data: AddNameDialogData,
    ) {
        if (data?.initial) {
            this.value.setValue(data.initial);
        }
    }

    onCancel() {
        this.dialogRef.close();
    }

    onSave() {
        const v = this.value.value.trim();
        if (!v) return;
        this.dialogRef.close(v);
    }
}

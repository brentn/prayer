import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    templateUrl: './confirm-dialog.component.html',
    styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    ) { }
}

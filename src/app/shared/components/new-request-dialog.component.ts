import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-new-request-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
    <h2 mat-dialog-title>New Prayer Request</h2>
    <mat-dialog-content>
      <p>Topic: {{ data.topicName }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class NewRequestDialogComponent {
    private dialogRef = inject(MatDialogRef<NewRequestDialogComponent>);
    data = inject(MAT_DIALOG_DATA);

    close() {
        this.dialogRef.close();
    }
}
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { ImportOptions } from '../../services/import-export';

@Component({
    selector: 'app-import-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatRadioModule,
        FormsModule,
    ],
    templateUrl: './import-dialog.html',
    styleUrl: './import-dialog.css',
})
export class ImportDialogComponent {
    private dialogRef = inject(MatDialogRef<ImportDialogComponent>);

    importOptions: ImportOptions = {
        includeRequests: true,
        includeStats: true,
        mergeMode: 'merge',
    };

    onCancel(): void {
        this.dialogRef.close();
    }

    onImport(): void {
        this.dialogRef.close(this.importOptions);
    }
}

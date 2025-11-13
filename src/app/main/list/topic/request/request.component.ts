import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RequestEntity } from '../../../../store/requests/request.reducer';

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatDialogModule],
    selector: 'app-request',
    templateUrl: './request.component.html',
    styleUrl: './request.component.css'
})
export class RequestComponent {
    private dialog = inject(MatDialog);
    @Input() request!: RequestEntity;
    @Input() isEditing = false;
    @Input() editingText = '';
    @Input() editingPriority = signal(1);
    @Input() requestState: 'open' | 'answered' | 'archived' = 'open';

    @Output() edit = new EventEmitter<number>();
    @Output() save = new EventEmitter<{ id: number, text: string, priority: number }>();
    @Output() cancel = new EventEmitter();
    @Output() deleteRequest = new EventEmitter<number>();
    @Output() markAnswered = new EventEmitter<number>();
    @Output() markUnanswered = new EventEmitter<number>();
    @Output() archive = new EventEmitter<number>();
    @Output() unarchive = new EventEmitter<number>();
    @Output() cyclePriority = new EventEmitter();

    onEdit() {
        this.edit.emit(this.request.id);
    }

    onSave() {
        this.save.emit({
            id: this.request.id,
            text: this.editingText,
            priority: this.editingPriority()
        });
    }

    onCancel() {
        this.cancel.emit();
    }

    async onDelete() {
        const { ConfirmDialogComponent } = await import('../../../../shared/components/confirm-dialog/confirm-dialog.component');
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Delete Prayer Request',
                message: 'Are you sure you want to delete this prayer request? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        });
        ref.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.deleteRequest.emit(this.request.id);
            }
        });
    }

    onMarkAnswered() {
        this.markAnswered.emit(this.request.id);
    }

    onMarkUnanswered() {
        this.markUnanswered.emit(this.request.id);
    }

    onArchive() {
        this.archive.emit(this.request.id);
    }

    onUnarchive() {
        this.unarchive.emit(this.request.id);
    }

    onCyclePriority() {
        this.cyclePriority.emit();
    }
}
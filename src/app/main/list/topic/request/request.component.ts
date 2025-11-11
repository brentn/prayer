import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RequestEntity } from '../../../../store/requests/request.reducer';

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule],
    selector: 'app-request',
    templateUrl: './request.component.html',
    styleUrl: './request.component.css'
})
export class RequestComponent {
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

    onDelete() {
        this.deleteRequest.emit(this.request.id);
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

    onUnarchiveRequest(id: number) {
        this.unarchive.emit(id);
    }

    onCyclePriority() {
        this.cyclePriority.emit();
    }
}
import { Component, Input, Output, EventEmitter, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Store } from '@ngrx/store';
import { selectAllRequests } from '../../../store/requests/request.selectors';
import { selectAllTopics } from '../../../store/topics/topic.selectors';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
    standalone: true,
    selector: 'app-prayer-card-content',
    imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule, MatDialogModule],
    templateUrl: './prayer-card-content.component.html',
    styleUrl: './prayer-card-content.component.css',
    animations: [
        trigger('answerFadeIn', [
            transition('void => *', [
                style({ opacity: 0, transform: 'translateY(-10px)' }),
                animate('350ms 200ms cubic-bezier(0.4, 0.0, 0.2, 1)') // Start after form begins closing
            ])
        ])
    ]
})
export class PrayerCardContentComponent {
    @Input() icon = 'favorite';
    @Input() title = '';
    @Input() topicName?: string;
    @Input() topicId?: number;
    @Input() isAnswered = false;
    @Input() localIsAnswered = false;
    @Input() answerDescription?: string;
    @Input() localAnswerDescription = '';
    @Input() onAnsweredClick?: () => void;
    @Input() showAnswerForm = false;
    @Input() isTopic = false;
    @Output() archive = new EventEmitter<void>();
    @Output() editTitle = new EventEmitter<string>();
    @Output() requestAnswered = new EventEmitter<{ id: number; answerDescription: string }>();
    @Output() requestArchived = new EventEmitter<{ id: number }>();
    @Output() requestTitleEdited = new EventEmitter<{ id: number; title: string }>();
    @Output() requestAnswerAdd = new EventEmitter<{ id: number; title: string }>();

    editingTitle = false;
    editingTitleValue = '';

    private store = inject(Store);
    private dialog = inject(MatDialog);
    private allRequests = this.store.selectSignal(selectAllRequests);
    private allTopics = this.store.selectSignal(selectAllTopics);

    // Active requests for current topic (unanswered and not archived)
    openRequests = computed(() => {
        if (!this.isTopic) return [];
        const tid = this.topicId ?? this.allTopics().find(t => t.name === this.topicName)?.id;
        if (!tid) return [];
        const topic = this.allTopics().find(t => t.id === tid);
        const ids = topic?.requestIds || [];
        return this.allRequests().filter(r => ids.includes(r.id) && !r.archived && !r.answeredDate);
    });

    startEditTitle() {
        this.editingTitle = true;
        this.editingTitleValue = this.title;
        // Focus the textarea after a short delay to ensure it's rendered
        setTimeout(() => {
            const textarea = document.querySelector('.title-input') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
                textarea.select();
            }
        }, 0);
    }

    saveTitleEdit() {
        const newTitle = this.editingTitleValue.trim();
        if (newTitle && newTitle !== this.title) {
            this.editTitle.emit(newTitle);
        }
        this.editingTitle = false;
        this.editingTitleValue = '';
    }

    cancelTitleEdit() {
        this.editingTitle = false;
        this.editingTitleValue = '';
    }

    // Topic-mode actions
    activeRequestId?: number;

    toggleRequestActions(reqId: number, ev?: MouseEvent) {
        // If clicking inside the actions container or a button, ignore
        const target = ev?.target as HTMLElement | undefined;
        if (target && target.closest('.request-actions')) return;
        this.activeRequestId = this.activeRequestId === reqId ? undefined : reqId;
    }

    markAnswered(reqId: number) {
        // Open session-level answer form via parent component
        const title = this.allRequests().find(r => r.id === reqId)?.description ?? '';
        this.requestAnswerAdd.emit({ id: reqId, title });
        this.activeRequestId = undefined;
    }

    archiveRequest(reqId: number) {
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Archive Request',
                message: 'Archive this request?',
                confirmText: 'Archive',
                cancelText: 'Cancel'
            }
        });
        ref.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.requestArchived.emit({ id: reqId });
                this.activeRequestId = undefined;
            }
        });
    }

    editRequestTitle(reqId: number, newTitle: string) {
        const title = newTitle.trim();
        if (title) this.requestTitleEdited.emit({ id: reqId, title });
    }
}
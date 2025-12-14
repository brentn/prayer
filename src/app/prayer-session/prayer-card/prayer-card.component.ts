import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, computed, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PrayerCardHeaderComponent } from './header/prayer-card-header.component';
import { PrayerCardContentComponent } from './content/prayer-card-content.component';
import { DateUtilsService } from '../../shared/services/date-utils.service';
import { PrayerSessionItem } from '../../shared/models/prayer-session.interface';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, PrayerCardHeaderComponent, PrayerCardContentComponent],
    templateUrl: './prayer-card.component.html',
    styleUrl: './prayer-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('slideInOut', [
            state('in', style({ height: '*', opacity: 1, transform: 'translateY(0)' })),
            transition('void => *', [
                style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }),
                animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)')
            ]),
            transition('* => void', [
                animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                    style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }))
            ])
        ]),
        trigger('answerFadeIn', [
            transition('void => *', [
                style({ opacity: 0, transform: 'translateY(-10px)' }),
                animate('350ms 200ms cubic-bezier(0.4, 0.0, 0.2, 1)') // Start after form begins closing
            ])
        ])
    ]
})
export class PrayerCardComponent implements OnChanges {
    private dateUtils = inject(DateUtilsService);
    private cdr = inject(ChangeDetectorRef);

    @Input() item!: PrayerSessionItem;

    @Output() answered = new EventEmitter<{ answerDescription: string }>();
    @Output() archive = new EventEmitter<void>();
    @Output() titleEdited = new EventEmitter<string>();
    @Output() addNewRequest = new EventEmitter<{ topicName: string; description: string }>();
    // Topic-mode per-request actions
    @Output() requestAnswered = new EventEmitter<{ id: number; answerDescription: string }>();
    @Output() requestArchived = new EventEmitter<{ id: number }>();
    @Output() requestTitleEdited = new EventEmitter<{ id: number; title: string }>();
    @Output() requestAnswerAdd = new EventEmitter<{ id: number; title: string }>();

    localTitle = signal('');
    localTitleEdited = signal(false);
    showDialog = signal(false);
    newRequestText = signal('');

    // Computed properties to extract values from item
    get icon() { return this.item.kind === 'topic' ? 'label' : 'favorite'; }
    get title() { return this.item.kind === 'topic' ? this.item.name : this.item.description; }
    get listName() { return this.item.listName; }
    get topicName() { return this.item.kind === 'request' ? this.item.topicName : undefined; }
    get topicId() { return this.item.kind === 'topic' ? this.item.id : undefined; }
    get createdDate() { return this.item.kind === 'request' ? this.item.createdDate : undefined; }
    get prayerCount() { return this.item.kind === 'request' ? this.item.prayerCount : undefined; }
    get priority() { return this.item.kind === 'request' ? this.item.priority : undefined; }
    get isAnswered() { return this.item.kind === 'request' ? Boolean(this.item.isAnswered) : false; }
    get answeredDate() { return this.item.kind === 'request' ? this.item.answeredDate : undefined; }
    get answerDescription() { return this.item.kind === 'request' ? this.item.answerDescription : undefined; }

    answeredSummary = computed(() => this.dateUtils.formatAnsweredSummary(this.prayerCount, this.createdDate, this.answeredDate));
    answeredDateText = computed(() => this.dateUtils.formatAnsweredDateText(this.isAnswered, this.answeredDate));

    ngOnChanges(changes: SimpleChanges) {
        // When the item changes, clear local state
        if (changes['item']) {
            this.localTitleEdited.set(false);
            this.localTitle.set('');
        }
    }

    onTitleEdited(newTitle: string) {
        // Update local state immediately for responsive UI
        this.localTitle.set(newTitle);
        this.localTitleEdited.set(true);
        // Emit to parent for store persistence
        this.titleEdited.emit(newTitle);
    }

    onNewRequest() {
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
        this.newRequestText.set('');
    }

    onSave() {
        const desc = this.newRequestText().trim();
        if (desc) {
            const topic = this.topicName || this.title;
            this.addNewRequest.emit({ topicName: topic, description: desc });
            this.closeDialog();
        }
    }
}

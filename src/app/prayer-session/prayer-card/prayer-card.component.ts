import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PrayerCardHeaderComponent } from './header/prayer-card-header.component';
import { PrayerCardContentComponent } from './content/prayer-card-content.component';
import { AnswerFormComponent } from './answer-form/answer-form.component';
import { DateUtilsService } from '../../shared/services/date-utils.service';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, MatIconModule, MatButtonModule, PrayerCardHeaderComponent, PrayerCardContentComponent, AnswerFormComponent],
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

    @Input() icon: string = 'favorite';
    @Input() title: string = '';
    @Input() listName?: string;
    @Input() topicName?: string;
    @Input() createdDate?: string;
    @Input() prayerCount?: number;
    @Input() priority?: number;
    @Input() isAnswered: boolean = false;
    @Input() answeredDate?: string;
    @Input() answerDescription?: string;

    @Output() answered = new EventEmitter<{ answerDescription: string }>();
    @Output() archive = new EventEmitter<void>();

    showAnswerForm = signal(false);
    answerText = signal('');
    localIsAnswered = signal(false);
    localAnswerDescription = signal('');

    answeredSummary = computed(() => this.dateUtils.formatAnsweredSummary(this.prayerCount, this.createdDate, this.answeredDate));
    answeredDateText = computed(() => this.dateUtils.formatAnsweredDateText(this.isAnswered, this.answeredDate));

    ngOnChanges(changes: SimpleChanges) {
        // When the authoritative answerDescription is updated from props, clear local state
        if (changes['answerDescription'] && changes['answerDescription'].currentValue) {
            this.localIsAnswered.set(false);
            this.localAnswerDescription.set('');
        }
        if (changes['isAnswered'] && changes['isAnswered'].currentValue) {
            this.localIsAnswered.set(false);
            this.localAnswerDescription.set('');
        }
    }

    onAnsweredClick() {
        this.showAnswerForm.set(true);
    }

    onAnswerSubmit(text: string) {
        this.answered.emit({ answerDescription: text });
        this.localIsAnswered.set(true);
        this.localAnswerDescription.set(text);
        this.showAnswerForm.set(false);
        this.answerText.set('');
    }

    onAnswerCancel() {
        this.showAnswerForm.set(false);
        this.answerText.set('');
    }
}

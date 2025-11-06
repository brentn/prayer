import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, TextFieldModule],
    templateUrl: './prayer-card.component.html',
    styleUrl: './prayer-card.component.css',
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
    @Input() icon: string = 'favorite';
    @Input() title: string = '';
    @Input() subtitle?: string;
    @Input() listName?: string;
    @Input() topicName?: string;
    @Input() createdDate?: string;
    @Input() prayerCount?: number;
    @Input() priority?: number;
    @Input() isAnswered: boolean = false;
    @Input() answeredDate?: string;
    @Input() answerDescription?: string;

    @Output() answered = new EventEmitter<{ answerDescription: string }>();

    showAnswerForm = false;
    answerText = '';
    localIsAnswered = false;
    localAnswerDescription = '';

    ngOnChanges(changes: SimpleChanges) {
        // When the authoritative answerDescription is updated from props, clear local state
        if (changes['answerDescription'] && changes['answerDescription'].currentValue) {
            this.localIsAnswered = false;
            this.localAnswerDescription = '';
        }
        if (changes['isAnswered'] && changes['isAnswered'].currentValue) {
            this.localIsAnswered = false;
            this.localAnswerDescription = '';
        }
    }

    onAnsweredClick() {
        this.showAnswerForm = true;
    }

    onAnswerSubmit() {
        if (this.answerText.trim()) {
            const trimmedAnswer = this.answerText.trim();
            this.answered.emit({ answerDescription: trimmedAnswer });
            this.localIsAnswered = true;
            this.localAnswerDescription = trimmedAnswer;
            this.showAnswerForm = false;
            this.answerText = '';
        }
    }

    onAnswerCancel() {
        this.showAnswerForm = false;
        this.answerText = '';
    }

    getPriorityClass(): string {
        if (!this.priority || this.priority <= 1) return '';
        if (this.priority === 2) return 'priority-2';
        if (this.priority === 3) return 'priority-3';
        if (this.priority === 4) return 'priority-4';
        return 'priority-5';
    }

    getAnsweredSummary(): string {
        if (!this.isAnswered || !this.prayerCount || !this.createdDate || !this.answeredDate) {
            return '';
        }

        const created = new Date(this.createdDate);
        const answered = new Date(this.answeredDate);
        const timeSpan = this.getTimeSpan(created, answered);

        const countText = this.prayerCount === 1 ? '1 time' : `${this.prayerCount} times`;
        return `Prayed ${countText} over ${timeSpan}`;
    }

    getAnsweredDateText(): string {
        if (!this.isAnswered || !this.answeredDate) return '';
        return `Answered ${new Date(this.answeredDate).toLocaleDateString()}`;
    }

    private getTimeSpan(start: Date, end: Date): string {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffYears > 0) {
            return diffYears === 1 ? '1 year' : `${diffYears} years`;
        } else if (diffMonths > 0) {
            return diffMonths === 1 ? '1 month' : `${diffMonths} months`;
        } else if (diffDays > 0) {
            return diffDays === 1 ? '1 day' : `${diffDays} days`;
        } else {
            return 'less than a day';
        }
    }
}

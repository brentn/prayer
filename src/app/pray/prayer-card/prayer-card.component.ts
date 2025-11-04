import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, MatIconModule],
    templateUrl: './prayer-card.component.html',
    styleUrl: './prayer-card.component.css'
})
export class PrayerCardComponent {
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

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    standalone: true,
    selector: 'app-prayer-card-header',
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './prayer-card-header.component.html',
    styleUrl: './prayer-card-header.component.css'
})
export class PrayerCardHeaderComponent {
    private readonly priorityClasses: Record<number, string> = {
        2: 'priority-2',
        3: 'priority-3',
        4: 'priority-4',
        5: 'priority-5'
    };

    @Input() priority?: number;
    @Input() isAnswered = false;
    @Input() localIsAnswered = false;
    @Input() prayerCount?: number;
    @Input() createdDate?: string;
    @Input() answeredDate?: string;
    @Input() answeredSummary = '';
    @Input() answeredDateText = '';
    @Input() showAnswerForm = false;
    @Input() isTopic = false;
    @Input() onAnsweredClick!: () => void;

    getPriorityClass(): string {
        return this.priorityClasses[this.priority || 0] || '';
    }
}
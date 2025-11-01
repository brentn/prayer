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

    getPriorityClass(): string {
        if (!this.priority || this.priority <= 1) return '';
        if (this.priority === 2) return 'priority-2';
        if (this.priority === 3) return 'priority-3';
        return 'priority-4';
    }
}

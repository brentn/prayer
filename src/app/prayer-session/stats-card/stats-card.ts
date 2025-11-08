import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TimerService } from '../../shared/services/timer.service';

@Component({
    selector: 'app-stats-card',
    imports: [CommonModule, MatIconModule],
    templateUrl: './stats-card.html',
    styleUrl: './stats-card.css',
})
export class StatsCard {
    @Input() totalItems = 0;
    @Input() sessionDuration = 0;
    @Input() prayerCount = 0;
    @Input() totalTimePrayed = 0;
    @Input() totalRequestsPrayed = 0;
    @Input() totalRequestsAnswered = 0;
    @Input() totalSessions = 0;
    @Input() sessionsPerWeek = 0;

    get averageTimePerPrayer(): number {
        if (this.prayerCount === 0) return 0;
        return Math.round(this.sessionDuration / this.prayerCount);
    }

    get averageSessionLength(): number {
        if (this.totalSessions === 0) return 0;
        return Math.round(this.totalTimePrayed / this.totalSessions);
    }

    get prayerStreak(): number {
        // Simple streak calculation - in a real app you'd track daily prayer
        // For now, just return sessions per week as an indicator
        return Math.round(this.sessionsPerWeek * 7);
    }

    get prayerEfficiency(): number {
        if (this.totalTimePrayed === 0) return 0;
        return Math.round((this.totalRequestsPrayed / this.totalTimePrayed) * 60); // requests per hour
    }

    get milestone(): string {
        if (this.totalSessions >= 100) return "Century of Prayer!";
        if (this.totalSessions >= 50) return "Golden Prayer!";
        if (this.totalSessions >= 25) return "Silver Prayer!";
        if (this.totalSessions >= 10) return "Bronze Prayer!";
        if (this.totalSessions >= 1) return "First Prayer!";
        return "";
    }

    formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    }
}

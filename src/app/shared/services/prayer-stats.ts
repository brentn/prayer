import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class PrayerStats {
    private readonly STORAGE_KEY = 'prayer-stats';

    // Cumulative stats signals
    private totalTimePrayed = signal<number>(0); // in seconds
    private totalRequestsPrayed = signal<number>(0);
    private totalRequestsAnswered = signal<number>(0);
    private totalSessions = signal<number>(0);
    private firstSessionDate = signal<string | null>(null);
    private lastSessionDate = signal<string | null>(null);

    constructor() {
        this.loadFromStorage();

        // Auto-save to localStorage when values change
        effect(() => {
            const stats = {
                totalTimePrayed: this.totalTimePrayed(),
                totalRequestsPrayed: this.totalRequestsPrayed(),
                totalRequestsAnswered: this.totalRequestsAnswered(),
                totalSessions: this.totalSessions(),
                firstSessionDate: this.firstSessionDate(),
                lastSessionDate: this.lastSessionDate(),
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        });
    }

    // Getters
    getTotalTimePrayed(): number {
        return this.totalTimePrayed();
    }

    getTotalRequestsPrayed(): number {
        return this.totalRequestsPrayed();
    }

    getTotalRequestsAnswered(): number {
        return this.totalRequestsAnswered();
    }

    getTotalSessions(): number {
        return this.totalSessions();
    }

    getFirstSessionDate(): string | null {
        return this.firstSessionDate();
    }

    getLastSessionDate(): string | null {
        return this.lastSessionDate();
    }

    // Calculate prayer frequency (sessions per week)
    getSessionsPerWeek(): number {
        const firstDate = this.firstSessionDate();
        const lastDate = this.lastSessionDate();
        const totalSessions = this.totalSessions();

        if (!firstDate || !lastDate || totalSessions <= 1) {
            return totalSessions; // Return total sessions if not enough data
        }

        const first = new Date(firstDate).getTime();
        const last = new Date(lastDate).getTime();
        const daysDiff = (last - first) / (1000 * 60 * 60 * 24);
        const weeksDiff = Math.max(daysDiff / 7, 1); // At least 1 week

        return totalSessions / weeksDiff;
    }

    // Update methods
    addSessionTime(seconds: number): void {
        this.totalTimePrayed.update(current => current + seconds);
    }

    addSessionRequestsPrayed(count: number): void {
        this.totalRequestsPrayed.update(current => current + count);
    }

    addRequestsAnswered(count: number): void {
        this.totalRequestsAnswered.update(current => current + count);
    }

    addSession(): void {
        this.totalSessions.update(current => current + 1);
        const now = new Date().toISOString();
        if (!this.firstSessionDate()) {
            this.firstSessionDate.set(now);
        }
        this.lastSessionDate.set(now);
    }

    // Load from localStorage
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const stats = JSON.parse(stored);
                this.totalTimePrayed.set(stats.totalTimePrayed || 0);
                this.totalRequestsPrayed.set(stats.totalRequestsPrayed || 0);
                this.totalRequestsAnswered.set(stats.totalRequestsAnswered || 0);
                this.totalSessions.set(stats.totalSessions || 0);
                this.firstSessionDate.set(stats.firstSessionDate || null);
                this.lastSessionDate.set(stats.lastSessionDate || null);
            }
        } catch (error) {
            console.warn('Failed to load prayer stats from localStorage:', error);
        }
    }

    // Reset stats (for testing/debugging)
    resetStats(): void {
        this.totalTimePrayed.set(0);
        this.totalRequestsPrayed.set(0);
        this.totalRequestsAnswered.set(0);
        this.totalSessions.set(0);
        this.firstSessionDate.set(null);
        this.lastSessionDate.set(null);
    }

    // Set all stats at once (for import/export)
    setAllStats(stats: {
        totalTimePrayed?: number;
        totalRequestsPrayed?: number;
        totalRequestsAnswered?: number;
        totalSessions?: number;
        firstSessionDate?: string | null;
        lastSessionDate?: string | null;
    }): void {
        this.totalTimePrayed.set(stats.totalTimePrayed || 0);
        this.totalRequestsPrayed.set(stats.totalRequestsPrayed || 0);
        this.totalRequestsAnswered.set(stats.totalRequestsAnswered || 0);
        this.totalSessions.set(stats.totalSessions || 0);
        this.firstSessionDate.set(stats.firstSessionDate || null);
        this.lastSessionDate.set(stats.lastSessionDate || null);
    }
}

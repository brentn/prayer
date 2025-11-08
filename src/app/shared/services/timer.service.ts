import { Injectable, signal } from '@angular/core';

export interface TimerConfig {
    timeMinutes: number;
    unlimited: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TimerService {
    // Timer state
    private countdownSeconds = signal<number>(0);
    private initialCountdownSeconds = signal<number>(0);
    private countdownStarted = signal<boolean>(false);
    private countdownId?: any;

    // View timer for prayer registration
    private viewTimerId?: any;
    private sessionCounted = new Set<number>();

    // Getters for reactive access
    getCountdownSeconds() {
        return this.countdownSeconds;
    }

    getInitialCountdownSeconds() {
        return this.initialCountdownSeconds;
    }

    getCountdownStarted() {
        return this.countdownStarted;
    }

    isUnlimited(config: TimerConfig): boolean {
        return config.unlimited;
    }

    getTimeMinutes(config: TimerConfig): number {
        return Math.min(config.timeMinutes, 60);
    }

    startCountdown(config: TimerConfig): void {
        if (config.unlimited) return;

        const total = config.timeMinutes * 60;
        this.countdownSeconds.set(total);
        this.initialCountdownSeconds.set(total);
        this.countdownStarted.set(true);

        if (this.countdownId) clearInterval(this.countdownId);

        this.countdownId = setInterval(() => {
            const next = this.countdownSeconds() - 1;
            this.countdownSeconds.set(Math.max(0, next));
            if (next <= 0 && this.countdownId) {
                clearInterval(this.countdownId);
                this.countdownId = undefined;
            }
        }, 1000);
    }

    startViewTimer(
        itemId: number,
        currentIndex: number,
        selectedItems: any[],
        registerSeconds: number,
        onRegister: (itemId: number) => void
    ): void {
        if (this.viewTimerId) {
            clearTimeout(this.viewTimerId);
            this.viewTimerId = undefined;
        }

        if (currentIndex < 1) return; // not on a request card
        const item = selectedItems[currentIndex - 1];
        if (!item || item.kind !== 'request' || item.isAnswered) return;
        if (this.sessionCounted.has(itemId)) return;

        const startId = itemId;
        const startIndex = currentIndex;

        this.viewTimerId = setTimeout(() => {
            // Check if still on the same card
            const curIdx = currentIndex;
            const curItem = selectedItems[curIdx - 1];
            if (curIdx === startIndex && curItem && curItem.kind === 'request' && curItem.id === startId) {
                // Increment once per session
                this.sessionCounted.add(startId);
                onRegister(startId);
            }
        }, 1000 * registerSeconds);
    }

    stopViewTimer(): void {
        if (this.viewTimerId) {
            clearTimeout(this.viewTimerId);
            this.viewTimerId = undefined;
        }
    }

    resetSessionCounted(): void {
        this.sessionCounted.clear();
    }

    getTimeProgressPercent(): number {
        const initial = this.initialCountdownSeconds();
        const current = this.countdownSeconds();
        if (initial <= 0) return 0;
        const elapsed = initial - current;
        return Math.min(100, Math.max(0, (elapsed / initial) * 100));
    }

    formatRemaining(): string {
        const total = this.countdownSeconds();
        if (total >= 60) {
            const m = Math.ceil(total / 60);
            return `${m} min`;
        } else {
            return `${total} sec`;
        }
    }

    getSessionPrayerCount(): number {
        return this.sessionCounted.size;
    }

    destroy(): void {
        if (this.countdownId) {
            clearInterval(this.countdownId);
            this.countdownId = undefined;
        }
        if (this.viewTimerId) {
            clearTimeout(this.viewTimerId);
            this.viewTimerId = undefined;
        }
    }
}
import { Injectable, signal } from '@angular/core';

/**
 * Service responsible for managing prayer session state
 * Tracks session lifecycle, timing, and completion status
 */
@Injectable()
export class PrayerSessionStateService {
    // Session lifecycle state
    readonly sessionStarted = signal(false);
    readonly sessionStartTime = signal<number | null>(null);
    readonly archivingItems = signal<Set<number>>(new Set());

    // Final session stats (captured when session ends)
    readonly finalSessionDuration = signal<number | null>(null);
    readonly finalPrayerCount = signal<number | null>(null);

    // Tracking for session counted items
    readonly sessionCounted = new Set<number>();

    /**
     * Start the prayer session
     */
    startSession(): void {
        this.sessionStarted.set(true);
        this.sessionStartTime.set(Date.now() / 1000);
    }

    /**
     * Check if the session has started
     */
    isSessionStarted(): boolean {
        return this.sessionStarted();
    }

    /**
     * Finalize session stats (called when reaching stats slide)
     * @param duration - Total session duration in seconds
     * @param prayerCount - Total prayers counted in session
     */
    finalizeSessionStats(duration: number, prayerCount: number): void {
        if (this.finalSessionDuration() === null) {
            this.finalSessionDuration.set(duration);
            this.finalPrayerCount.set(prayerCount);
        }
    }

    /**
     * Get the finalized session duration, or null if not yet finalized
     */
    getFinalDuration(): number | null {
        return this.finalSessionDuration();
    }

    /**
     * Get the finalized prayer count, or null if not yet finalized
     */
    getFinalPrayerCount(): number | null {
        return this.finalPrayerCount();
    }

    /**
     * Add an item to the archiving set
     */
    addArchivingItem(id: number): void {
        this.archivingItems.update(items => {
            const newSet = new Set(items);
            newSet.add(id);
            return newSet;
        });
    }

    /**
     * Remove an item from the archiving set
     */
    removeArchivingItem(id: number): void {
        this.archivingItems.update(items => {
            const newSet = new Set(items);
            newSet.delete(id);
            return newSet;
        });
    }

    /**
     * Mark a request as counted in this session
     */
    markAsCounted(requestId: number): void {
        this.sessionCounted.add(requestId);
    }

    /**
     * Check if a request has been counted in this session
     */
    hasBeenCounted(requestId: number): boolean {
        return this.sessionCounted.has(requestId);
    }

    /**
     * Reset all session state
     */
    reset(): void {
        this.sessionStarted.set(false);
        this.sessionStartTime.set(null);
        this.finalSessionDuration.set(null);
        this.finalPrayerCount.set(null);
        this.sessionCounted.clear();
        this.archivingItems.set(new Set());
    }
}

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WakeLockService {
    private wakeLock: WakeLockSentinel | null = null;
    private isRequesting = false;

    async request() {
        if (this.isRequesting) return;
        this.isRequesting = true;
        try {
            if ('wakeLock' in navigator && 'request' in (navigator as any).wakeLock) {
                this.wakeLock = await (navigator as any).wakeLock.request('screen');
                if (this.wakeLock) {
                    this.wakeLock.addEventListener?.('release', () => {
                        this.wakeLock = null;
                    });
                }
            }
        } catch (e) {
            // Ignore errors; some browsers require user interaction or may not support it.
        } finally {
            this.isRequesting = false;
        }
    }

    async release() {
        try {
            await this.wakeLock?.release?.();
        } catch { }
        this.wakeLock = null;
    }

    initAutoRenew() {
        // Re-request when page becomes visible again (wake lock gets released when tab loses focus)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.request();
            }
        });

        // Best-effort: on first user interaction, try to acquire if not already
        window.addEventListener('pointerdown', () => this.request(), { once: true, passive: true });
    }
}

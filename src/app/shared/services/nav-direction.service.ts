import { Injectable, signal } from '@angular/core';

export type NavDirection = 'forward' | 'back' | 'idle';

@Injectable({ providedIn: 'root' })
export class NavDirectionService {
    // Start in an 'idle' state so the first explicit navigation to 'forward' or 'back' triggers animations.
    private dir = signal<NavDirection>('idle');
    direction = this.dir.asReadonly();
    setDirection(d: Exclude<NavDirection, 'idle'>) { this.dir.set(d); }
}

import { Component, effect, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngrx/store';
import { selectAllLists } from './store/lists/list.selectors';
import { WakeLockService } from './shared/services/wake-lock.service';
import { SettingsService } from './shared/services/settings.service';
import { PrayTabComponent } from './shared/components/pray-tab/pray-tab.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, RouterLink, MatIconModule, MatButtonModule, MatMenuModule, PrayTabComponent],
    templateUrl: './app.html',
    styleUrl: './app.css',
    animations: [
        trigger('routeSlide', [
            // Forward: when depth increases
            transition(':increment', [
                query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), { optional: true }),
                query(':enter', style({ transform: 'translateX(100%)', 'z-index': 2 }), { optional: true }),
                group([
                    query(':leave', animate('500ms ease-in-out', style({ transform: 'translateX(-100%)' })), { optional: true }),
                    query(':enter', animate('500ms ease-in-out', style({ transform: 'translateX(0)' })), { optional: true })
                ])
            ]),
            // Back: when depth decreases
            transition(':decrement', [
                query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), { optional: true }),
                query(':enter', style({ transform: 'translateX(-100%)', 'z-index': 2 }), { optional: true }),
                group([
                    query(':leave', animate('500ms ease-in-out', style({ transform: 'translateX(100%)' })), { optional: true }),
                    query(':enter', animate('500ms ease-in-out', style({ transform: 'translateX(0)' })), { optional: true })
                ])
            ])
        ])
    ]
})
export class App implements OnInit {
    protected title = 'Prayer';
    private router = inject(Router);
    // Keep screen awake when permitted by setting
    private wake = inject(WakeLockService);
    private settings = inject(SettingsService);

    constructor() {
        // React to keepAwake setting changes
        effect(() => {
            const enabled = this.settings.keepAwake();
            if (enabled) this.wake.request();
            else this.wake.release();
        });
    }

    ngOnInit(): void {
        // Initialize auto-renew
        this.wake.initAutoRenew();
    }
    private store = inject(Store);
    lists = this.store.selectSignal(selectAllLists);

    get showBack(): boolean {
        const url = this.router.url || '';
        return url.startsWith('/list/') || url.startsWith('/topic/');
    }

    get showPrayTab(): boolean {
        const url = this.router.url || '';
        // Show on main and list pages only, but only if there are non-excluded lists with topics
        const hasListsWithTopics = this.lists().some(list => (!list.excludeFromAll && list.topicIds || []).length > 0);
        return hasListsWithTopics && (url === '/' || url.startsWith('/list/'));
    }

    get currentListId(): number | undefined {
        const url = this.router.url || '';
        if (url.startsWith('/list/')) {
            const maybe = Number(url.split('/')[2]);
            if (!isNaN(maybe)) return maybe;
        }
        return undefined;
    }

    backFromHeader(): void {
        const url = this.router.url || '';
        if (url.startsWith('/topic/')) {
            const topicId = Number(url.split('/')[2]);
            if (!isNaN(topicId)) {
                const list = this.lists().find(l => (l.topicIds || []).includes(topicId));
                if (list) {
                    this.router.navigate(['/list', list.id]);
                    return;
                }
            }
        }
        // default: go back to main
        this.router.navigate(['/']);
    }

    getDepth(outlet: RouterOutlet): any {
        return outlet?.activatedRouteData?.['depth'] ?? 0;
    }
}

import { Component, effect, inject, OnInit, signal, Renderer2, ElementRef } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd, NavigationStart } from '@angular/router';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { selectAllLists } from './store/lists/list.selectors';
import { WakeLockService } from './shared/services/wake-lock.service';
import { SettingsService } from './shared/services/settings.service';
import { PrayTabComponent } from './shared/components/pray-tab/pray-tab.component';
import { ImportExportService, ImportOptions } from './shared/services/import-export';
import { ImportDialogComponent } from './shared/components/import-dialog/import-dialog';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, RouterLink, MatIconModule, MatButtonModule, MatMenuModule, MatDialogModule, PrayTabComponent],
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
    private importExport = inject(ImportExportService);
    private dialog = inject(MatDialog);
    private renderer = inject(Renderer2);
    private elementRef = inject(ElementRef);

    // Track current URL for wake lock logic
    currentUrl = signal<string>('');

    constructor() {
        // React to keepAwake setting and route changes
        effect(() => {
            const enabled = this.settings.keepAwake();
            const url = this.currentUrl();
            const isOnPrayPage = url.startsWith('/pray');

            if (!enabled || !isOnPrayPage) {
                this.wake.release();
            }
        });

        // React to theme changes
        effect(() => {
            const theme = this.settings.theme();
            // Remove all theme classes first
            this.renderer.removeClass(document.body, 'dark-theme');
            this.renderer.removeClass(document.body, 'light-theme');
            this.renderer.removeClass(document.body, 'minty-theme');

            // Add the current theme class
            if (theme === 'light') {
                this.renderer.addClass(document.body, 'light-theme');
            } else if (theme === 'minty') {
                this.renderer.addClass(document.body, 'minty-theme');
            } else {
                this.renderer.addClass(document.body, 'dark-theme');
            }
        });
    }

    async ngOnInit(): Promise<void> {
        // Initialize auto-renew
        this.wake.initAutoRenew();

        // Track URL changes for wake lock logic
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.currentUrl.set(event.url);
        });

        // Handle browser back button navigation
        this.router.events.pipe(
            filter(event => event instanceof NavigationStart)
        ).subscribe((event: NavigationStart) => {
            if (event.navigationTrigger === 'popstate') {
                // Browser back/forward button was pressed
                const currentUrl = this.router.url;
                if (currentUrl.startsWith('/topic/')) {
                    const topicId = Number(currentUrl.split('/')[2]);
                    if (!isNaN(topicId)) {
                        const list = this.lists().find(l => (l.topicIds || []).includes(topicId));
                        if (list) {
                            this.router.navigate(['/list', list.id]);
                            return;
                        }
                    }
                } else if (currentUrl.startsWith('/list/')) {
                    // On list page, redirect to main page
                    this.router.navigate(['/'], { replaceUrl: true });
                } else if (currentUrl === '/') {
                    this.router.navigate(['/'], { replaceUrl: true });
                }
            }
        });

        // Set initial URL
        this.currentUrl.set(this.router.url);

        // Create default "My Family" list if no lists exist
        const currentLists = this.lists();
        if (currentLists.length === 0) {
            const { addList } = await import('./store/lists/list.actions');
            this.store.dispatch(addList({ name: 'My Family' }));
        }
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

    exportData(): void {
        const url = this.router.url || '';
        let data;
        let filename;

        if (url === '/') {
            // Main page - export all data
            data = this.importExport.exportAllData();
            filename = `prayer-data-${new Date().toISOString().split('T')[0]}.json`;
        } else if (url.startsWith('/list/')) {
            // List page - export list data
            const listId = this.currentListId;
            if (listId !== undefined) {
                data = this.importExport.exportListData(listId);
                const list = this.lists().find(l => l.id === listId);
                filename = `prayer-list-${list?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
            }
        } else if (url.startsWith('/topic/')) {
            // Topic page - export topic data
            const topicId = Number(url.split('/')[2]);
            if (!isNaN(topicId)) {
                data = this.importExport.exportTopicData(topicId);
                filename = `prayer-topic-${topicId}-${new Date().toISOString().split('T')[0]}.json`;
            }
        }

        if (data && filename) {
            this.importExport.downloadData(data, filename);
        }
    }

    importData(): void {
        // Create a hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target?.result as string);
                        // Open import dialog with options
                        const dialogRef = this.dialog.open(ImportDialogComponent, {
                            width: '400px',
                            data: {}
                        });

                        dialogRef.afterClosed().subscribe((options: ImportOptions) => {
                            if (options) {
                                this.importExport.importData(data, options);
                            }
                        });
                    } catch (error) {
                        console.error('Error parsing import file:', error);
                        // TODO: Show error dialog
                    }
                };
                reader.readAsText(file);
            }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    getDepth(outlet: RouterOutlet): any {
        return outlet?.activatedRouteData?.['depth'] ?? 0;
    }
}

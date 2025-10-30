import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectAllLists } from '../../../store/lists/list.selectors';
import { Router } from '@angular/router';

@Component({
    selector: 'app-pager-dots',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pager-dots.component.html',
    styleUrl: './pager-dots.component.css'
})
export class PagerDotsComponent {
    private store = inject(Store);
    private router = inject(Router);

    lists = this.store.selectSignal(selectAllLists);
    count = computed(() => 1 + this.lists().length);
    pages = computed(() => Array.from({ length: this.count() }, (_, i) => i));
    index = computed(() => {
        const url = this.router.url;
        if (url.startsWith('/list/')) {
            const id = Number(url.split('/')[2]);
            const idx = this.lists().findIndex(l => l.id === id);
            return idx >= 0 ? idx + 1 : 0;
        }
        return 0; // main
    });
}

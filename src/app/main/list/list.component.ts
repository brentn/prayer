import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Store } from '@ngrx/store';
import { selectAllTopics } from '../../store/topics/topic.selectors';
import { addTopicWithId, removeTopic } from '../../store/topics/topic.actions';
import { ActivatedRoute, Router } from '@angular/router';
import { selectAllLists } from '../../store/lists/list.selectors';
import { selectAllRequests } from '../../store/requests/request.selectors';

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatCheckboxModule],
    templateUrl: './list.component.html',
    styleUrl: './list.component.css'
})
export class ListComponent implements OnInit {
    private store = inject(Store);
    private dialog = inject(MatDialog);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    editing = false;
    editName = '';
    editExcludeFromAll = false;

    listId = signal<number | undefined>(undefined);

    allTopics = this.store.selectSignal(selectAllTopics);
    lists = this.store.selectSignal(selectAllLists);
    requests = this.store.selectSignal(selectAllRequests);
    currentList = computed(() => this.lists().find(l => l.id === this.listId()));
    topics = computed(() => {
        const l = this.currentList();
        if (!l) return [];
        const set = new Set(l.topicIds);
        return this.allTopics().filter(t => set.has(t.id));
    });

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.listId.set(Number(params.get('id')) || undefined);
        });
    }

    async onAdd() {
        const { AddNameDialogComponent } = await import('../../shared/components/add-name-dialog/add-name-dialog.component');
        const ref = this.dialog.open(AddNameDialogComponent, {
            data: { title: 'New Topic', label: 'Topic name', placeholder: 'e.g., Health' }
        });
        ref.afterClosed().subscribe(async value => {
            if (!value) return;
            const topics = this.allTopics();
            const nextId = topics.length ? Math.max(...topics.map(t => t.id)) + 1 : 1;
            this.store.dispatch(addTopicWithId({ id: nextId, name: value }));
            const list = this.currentList();
            if (list) {
                const topicIds = Array.from(new Set([...(list.topicIds || []), nextId]));
                const { updateList } = await import('../../store/lists/list.actions');
                this.store.dispatch(updateList({ id: list.id, changes: { topicIds } }));
            }
        });
    }

    async onRename() {
        const list = this.currentList();
        if (!list) return;
        const { AddNameDialogComponent } = await import('../../shared/components/add-name-dialog/add-name-dialog.component');
        const ref = this.dialog.open(AddNameDialogComponent, {
            data: { title: 'Rename List', label: 'List name', placeholder: 'e.g., Family' }
        });
        // Pre-fill current name
        ref.afterOpened().subscribe(() => {
            ref.componentInstance?.value?.setValue(list.name);
        });
        ref.afterClosed().subscribe(async value => {
            if (!value) return;
            const { updateList } = await import('../../store/lists/list.actions');
            this.store.dispatch(updateList({ id: list.id, changes: { name: value } }));
        });
    }

    async onDelete() {
        const list = this.currentList();
        if (!list) return;
        if ((this.topics() || []).length > 0) return; // disabled in UI, guard anyway
        const { ConfirmDialogComponent } = await import('../../shared/components/confirm-dialog/confirm-dialog.component');
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Delete List', message: `Delete "${list.name}"? This cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel' }
        });
        ref.afterClosed().subscribe(async ok => {
            if (!ok) return;
            const { removeList } = await import('../../store/lists/list.actions');
            this.store.dispatch(removeList({ id: list.id }));
            this.router.navigate(['/']);
        });
    }

    async onRemove(id: number) {
        this.store.dispatch(removeTopic({ id }));
        const list = this.currentList();
        if (list) {
            const topicIds = (list.topicIds || []).filter(tid => tid !== id);
            const { updateList } = await import('../../store/lists/list.actions');
            this.store.dispatch(updateList({ id: list.id, changes: { topicIds } }));
        }
    }

    back() {
        this.router.navigate(['/']);
    }

    openTopic(id: number) {
        this.router.navigate(['/topic', id]);
    }

    startEdit() {
        if (this.editing) return;
        const l = this.currentList();
        this.editing = true;
        this.editName = l?.name || '';
        this.editExcludeFromAll = l?.excludeFromAll || false;
    }

    async saveEdit() {
        const l = this.currentList();
        if (!l) { this.editing = false; return; }
        const value = (this.editName || '').trim();
        if (value && value !== l.name) {
            const { updateList } = await import('../../store/lists/list.actions');
            this.store.dispatch(updateList({ id: l.id, changes: { name: value, excludeFromAll: this.editExcludeFromAll } }));
        } else if (this.editExcludeFromAll !== (l.excludeFromAll || false)) {
            const { updateList } = await import('../../store/lists/list.actions');
            this.store.dispatch(updateList({ id: l.id, changes: { excludeFromAll: this.editExcludeFromAll } }));
        }
        this.editing = false;
    }

    cancelEdit() {
        this.editing = false;
        this.editName = '';
        this.editExcludeFromAll = false;
    }

    getRequestCount(topicId: number): number {
        const topic = this.allTopics().find(t => t.id === topicId);
        return topic?.requestIds?.length || 0;
    }

    onSectionClick() {
        if (this.editing) this.saveEdit();
    }
}

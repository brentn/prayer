import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Store } from '@ngrx/store';
import { selectAllRequests } from '../../../store/requests/request.selectors';
import { addRequestWithId, removeRequest, updateRequest } from '../../../store/requests/request.actions';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewChild, ElementRef } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { selectAllTopics } from '../../../store/topics/topic.selectors';
import { selectAllLists } from '../../../store/lists/list.selectors';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatTabsModule],
    templateUrl: './topic.component.html',
    styleUrl: './topic.component.css'
})
export class TopicComponent {
    @ViewChild('requestsContainer') requestsContainer?: ElementRef<HTMLDivElement>;
    private store = inject(Store);
    private dialog = inject(MatDialog);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    editing = false;
    editName = '';
    editingRequestId: number | null = null;
    editingRequestText = '';
    editingRequestPriority = signal(1);
    editingExisting = false;

    allRequests = this.store.selectSignal(selectAllRequests);
    allTopics = this.store.selectSignal(selectAllTopics);
    allLists = this.store.selectSignal(selectAllLists);
    activeTabIndex = 0;

    topicId = Number(this.route.snapshot.paramMap.get('id')) || undefined;
    currentTopic = computed(() => this.allTopics().find(t => t.id === this.topicId));
    currentList = computed(() => this.allLists().find(l => (l.topicIds || []).includes(this.topicId!)));
    requests = computed(() => {
        const topic = this.currentTopic();
        if (!topic) return [];
        const set = new Set(topic.requestIds || []);
        return this.allRequests().filter(r => set.has(r.id));
    });

    openRequests = computed(() => this.requests().filter(r => !r.answeredDate));
    answeredRequests = computed(() => this.requests().filter(r => !!r.answeredDate));

    back() {
        const l = this.currentList();
        if (l) this.router.navigate(['/list', l.id]);
        else this.router.navigate(['/lists']);
    }

    startEdit() {
        if (this.editing) return;
        const topic = this.currentTopic();
        this.editing = true;
        this.editName = topic?.name || '';
    }

    async saveEdit() {
        const topic = this.currentTopic();
        if (!topic) { this.editing = false; return; }
        const value = (this.editName || '').trim();
        if (value && value !== topic.name) {
            const { updateTopic } = await import('../../../store/topics/topic.actions');
            this.store.dispatch(updateTopic({ id: topic.id, changes: { name: value } }));
        }
        this.editing = false;
    }

    cancelEdit() {
        this.editing = false;
        this.editName = '';
    }

    onSectionClick() {
        if (this.editing) {
            this.saveEdit();
        }
    }

    async onAdd() {
        // Ensure we're on the Requests tab when adding
        this.activeTabIndex = 0;
        // Inline add: create a new empty request and start editing it in place
        // Determine next request id from current state
        const requests = this.allRequests();
        const nextId = requests.length ? Math.max(...requests.map(r => r.id)) + 1 : 1;
        // Add the request with a temporary empty description
        this.store.dispatch(addRequestWithId({ id: nextId, description: '' }));
        // Link the request to the current topic
        const topic = this.currentTopic();
        if (topic) {
            const requestIds = Array.from(new Set([...(topic.requestIds || []), nextId]));
            const { updateTopic } = await import('../../../store/topics/topic.actions');
            this.store.dispatch(updateTopic({ id: topic.id, changes: { requestIds } }));
        }
        // Begin inline editing
        this.editingRequestId = nextId;
        this.editingRequestText = '';
        this.editingRequestPriority.set(1);
        this.editingExisting = false;
        this.scrollToBottomSoon();
    }

    async onRemove(id: number) {
        this.store.dispatch(removeRequest({ id }));
        // Also unlink the request id from the current topic
        const topic = this.currentTopic();
        if (topic) {
            const requestIds = (topic.requestIds || []).filter(rid => rid !== id);
            const { updateTopic } = await import('../../../store/topics/topic.actions');
            this.store.dispatch(updateTopic({ id: topic.id, changes: { requestIds } }));
        }
    }

    async onRenameTopic() {
        const topic = this.currentTopic();
        if (!topic) return;
        const { AddNameDialogComponent } = await import('../../../shared/components/add-name-dialog/add-name-dialog.component');
        const ref = this.dialog.open(AddNameDialogComponent, {
            data: { title: 'Rename Topic', label: 'Topic name', initial: topic.name }
        });
        ref.afterClosed().subscribe(async value => {
            if (!value) return;
            const { updateTopic } = await import('../../../store/topics/topic.actions');
            this.store.dispatch(updateTopic({ id: topic.id, changes: { name: value } }));
        });
    }

    async onDeleteTopic() {
        const topic = this.currentTopic();
        if (!topic) return;
        if (this.requests().length > 0) return; // guard; should be disabled anyway
        const { ConfirmDialogComponent } = await import('../../../shared/components/confirm-dialog/confirm-dialog.component');
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Delete Topic', message: 'Are you sure you want to delete this topic?', confirmText: 'Delete' }
        });
        ref.afterClosed().subscribe(async ok => {
            if (!ok) return;
            const { removeTopic } = await import('../../../store/topics/topic.actions');
            this.store.dispatch(removeTopic({ id: topic.id }));
            this.back();
        });
    }

    async onEditRequest(id: number) {
        const req = this.allRequests().find(r => r.id === id);
        if (!req) return;
        if (this.editingRequestId === id) return; // already editing inline
        this.editingRequestId = id;
        this.editingRequestText = req.description;
        this.editingRequestPriority.set(req.priority || 1);
        this.editingExisting = true;
    }

    async saveInline(id: number) {
        const desc = (this.editingRequestText || '').trim();
        if (!desc) return;
        const changes: any = { description: desc, priority: this.editingRequestPriority() };
        this.store.dispatch(updateRequest({ id, changes }));
        this.editingRequestId = null;
        this.editingRequestText = '';
        this.editingRequestPriority.set(1);
        this.editingExisting = false;
    }

    async cancelInline() {
        // If the inline request has empty description, remove it
        const id = this.editingRequestId;
        if (id == null) return;
        const req = this.allRequests().find(r => r.id === id);
        if (!req || !req.description?.trim()) {
            await this.onRemove(id);
        }
        this.editingRequestId = null;
        this.editingRequestText = '';
        this.editingRequestPriority.set(1);
        this.editingExisting = false;
    }

    async onInlineDelete() {
        const id = this.editingRequestId;
        if (id == null) return;
        await this.onRemove(id);
        this.editingRequestId = null;
        this.editingRequestText = '';
        this.editingRequestPriority.set(1);
        this.editingExisting = false;
    }

    private scrollToBottomSoon() {
        setTimeout(() => {
            const el = this.requestsContainer?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        }, 0);
    }

    async markAnsweredInline(id: number) {
        const desc = (this.editingRequestText || '').trim();
        if (!desc) return;
        const changes: any = { description: desc, answeredDate: new Date().toISOString(), priority: this.editingRequestPriority() };
        this.store.dispatch(updateRequest({ id, changes }));
        this.editingRequestId = null;
        this.editingRequestText = '';
        this.editingRequestPriority.set(1);
        this.editingExisting = false;
        // Move to Answers tab after marking answered
        this.activeTabIndex = 1;
    }

    cyclePriority() {
        const current = this.editingRequestPriority();
        this.editingRequestPriority.set(current >= 5 ? 1 : current + 1);
    }
}

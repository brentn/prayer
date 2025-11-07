import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllRequests } from '../../store/requests/request.selectors';
import { selectAllTopics } from '../../store/topics/topic.selectors';
import { selectAllLists } from '../../store/lists/list.selectors';
import { SettingsService } from './settings.service';
import { RequestEntity } from '../../store/requests/request.reducer';
import { Topic } from '../models/topic';
import { List } from '../models/list';

export type ItemVm = {
    kind: 'request',
    id: number,
    description: string,
    listName?: string,
    topicName?: string,
    createdDate?: string,
    prayerCount?: number,
    priority?: number,
    isAnswered?: boolean,
    answeredDate?: string,
    answerDescription?: string
} | {
    kind: 'topic',
    id: number,
    name: string,
    listName?: string
};

@Injectable({
    providedIn: 'root'
})
export class PrayerSessionService {
    private store = inject(Store);
    private settings = inject(SettingsService);

    // Input signals that would be set by the component
    private listIdSignal = signal<number | undefined>(undefined);
    private sessionStartedSignal = signal(false);

    // Store selectors
    private lists = this.store.selectSignal(selectAllLists);
    private topics = this.store.selectSignal(selectAllTopics);
    private requests = this.store.selectSignal(selectAllRequests);

    // Computed values
    private answeredRequests = computed(() => this.requests().filter((r: RequestEntity) => r.answeredDate));

    private effectiveListId = computed(() => this.listIdSignal());

    // Combined list of items to pray for: requests, plus topics with no requests
    private baseItems = computed(() => {
        const lid = this.effectiveListId();
        const allTopics = this.topics();
        const allRequests = this.requests();

        // If a listId is provided, reduce scope to that list's topics
        let scopedTopicIds: number[] | undefined;
        if (lid) {
            const list = this.lists().find((l: List) => l.id === lid);
            scopedTopicIds = list?.topicIds || [];
        } else {
            // When praying for all lists, exclude topics from lists marked as excludeFromAll
            const excludedListIds = new Set(this.lists().filter((l: List) => l.excludeFromAll).map((l: List) => l.id));
            scopedTopicIds = allTopics
                .filter((t: Topic) => {
                    // Find which list this topic belongs to
                    const topicList = this.lists().find((l: List) => (l.topicIds || []).includes(t.id));
                    return topicList && !excludedListIds.has(topicList.id);
                })
                .map((t: Topic) => t.id);
        }

        // Build a set of scoped topics
        const topicSet = new Set(scopedTopicIds ?? allTopics.map((t: Topic) => t.id));
        const scopedTopics = allTopics.filter((t: Topic) => topicSet.has(t.id));

        // Requests within the scoped topics
        const requestIdSet = new Set<number>();
        const scopedRequests = allRequests.map((r: RequestEntity) => ({
            ...r,
            // Default missing priority to 1 for backward compatibility
            priority: (r as any).priority ?? 1,
        })).filter((r: RequestEntity) => {
            // Find topics that include this request id
            // Avoid repeated includes by building set once
            if (requestIdSet.has(r.id)) return true;
            const belongs = scopedTopics.some((t: Topic) => (t.requestIds || []).includes(r.id));
            if (belongs) requestIdSet.add(r.id);
            return belongs && !r.answeredDate;
        });

        // Topics with no requests within scope
        const emptyTopics = scopedTopics.filter((t: Topic) => (t.requestIds || []).length === 0);

        // Non-shuffle: sort requests by priority*10 - prayerCount (desc)
        const scored = scopedRequests.map((r: RequestEntity) => ({
            r,
            score: (Number(r.priority) || 1) * 10 - (Number(r.prayerCount) || 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        const items: ItemVm[] = [];
        for (const { r } of scored) {
            const ownerTopic = scopedTopics.find(t => (t.requestIds || []).includes(r.id));
            const ownerList = this.lists().find(l => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));
            items.push({
                kind: 'request',
                id: r.id,
                description: r.description,
                listName: ownerList?.name,
                topicName: ownerTopic?.name,
                createdDate: r.createdDate,
                priority: r.priority,
                prayerCount: r.prayerCount
            });
        }
        // Put topics with no requests after sorted requests (preserve earlier behavior)
        for (const t of emptyTopics) {
            const ownerList = this.lists().find(l => (l.topicIds || []).includes(t.id));
            items.push({ kind: 'topic', id: t.id, name: t.name, listName: ownerList?.name });
        }
        return items;
    });

    // Shuffled or sorted items, fixed for the session
    private shuffledItems = signal<ItemVm[]>([]);
    private lastIds = '';
    private lastShuffle = false;

    // Update shuffledItems only when the list changes and session hasn't started
    private updateShuffledEffect = effect(() => {
        const lid = this.effectiveListId();
        const allTopics = this.topics();
        const allRequests = this.requests();
        const shuffle = this.settings.shuffleRequests();
        const sessionStarted = this.sessionStartedSignal();

        // Compute ids to detect list changes
        let scopedTopicIds: number[] | undefined;
        if (lid) {
            const list = this.lists().find((l: List) => l.id === lid);
            scopedTopicIds = list?.topicIds || [];
        } else {
            // When praying for all lists, exclude topics from lists marked as excludeFromAll
            const excludedListIds = new Set(this.lists().filter((l: List) => l.excludeFromAll).map((l: List) => l.id));
            scopedTopicIds = allTopics
                .filter((t: Topic) => {
                    // Find which list this topic belongs to
                    const topicList = this.lists().find((l: List) => (l.topicIds || []).includes(t.id));
                    return topicList && !excludedListIds.has(topicList.id);
                })
                .map((t: Topic) => t.id);
        }
        const topicSet = new Set(scopedTopicIds ?? allTopics.map((t: Topic) => t.id));
        const scopedTopics = allTopics.filter((t: Topic) => topicSet.has(t.id));
        const scopedRequests = allRequests.filter((r: RequestEntity) => scopedTopics.some((t: Topic) => (t.requestIds || []).includes(r.id)) && !r.answeredDate);
        const emptyTopics = scopedTopics.filter((t: Topic) => (t.requestIds || []).length === 0);
        const ids = [...scopedRequests.map(r => r.id), ...emptyTopics.map(t => t.id)].sort().join(',');

        if ((this.lastIds !== ids || this.lastShuffle !== shuffle) && !sessionStarted) {
            this.lastIds = ids;
            this.lastShuffle = shuffle;

            if (shuffle) {
                // Expand requests by priority, include topics as single items
                const weighted: ItemVm[] = [];
                for (const r of scopedRequests) {
                    const ownerTopic = scopedTopics.find((t: Topic) => (t.requestIds || []).includes(r.id));
                    const ownerList = this.lists().find((l: List) => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));
                    const repeats = Math.max(1, Number(r.priority) || 1);
                    for (let i = 0; i < repeats; i++) {
                        weighted.push({
                            kind: 'request',
                            id: r.id,
                            description: r.description,
                            listName: ownerList?.name,
                            topicName: ownerTopic?.name,
                            createdDate: r.createdDate,
                            priority: r.priority,
                            prayerCount: r.prayerCount
                        });
                    }
                }
                for (const t of emptyTopics) {
                    const ownerList = this.lists().find((l: List) => (l.topicIds || []).includes(t.id));
                    weighted.push({ kind: 'topic', id: t.id, name: t.name, listName: ownerList?.name });
                }

                // Fisher-Yates shuffle
                for (let i = weighted.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
                }

                // Deduplicate by request id (keep first occurrence), topics are unique
                const seenReq = new Set<number>();
                const deduped: ItemVm[] = [];
                for (const item of weighted) {
                    if (item.kind === 'topic') { deduped.push(item); continue; }
                    if (!seenReq.has(item.id)) {
                        seenReq.add(item.id);
                        deduped.push(item);
                    }
                }
                this.shuffledItems.set(deduped);
            } else {
                this.shuffledItems.set(this.baseItems());
            }
        }
    });

    // Final items with updated prayerCount
    private items = computed(() => {
        const shuffled = this.shuffledItems();
        const currentRequests = this.requests();
        return shuffled.map(item => {
            if (item.kind === 'request') {
                const current = currentRequests.find(r => r.id === item.id);
                if (current && current.prayerCount !== item.prayerCount) {
                    return { ...item, prayerCount: current.prayerCount };
                }
            }
            return item;
        });
    });

    // Public API
    setListId(listId: number | undefined) {
        this.listIdSignal.set(listId);
    }

    setSessionStarted(started: boolean) {
        this.sessionStartedSignal.set(started);
    }

    getItems() {
        return this.items;
    }

    getAnsweredRequests() {
        return this.answeredRequests;
    }

    getShuffledItems() {
        return this.shuffledItems;
    }

    // Helper methods for component
    getMaxSelectable(): number {
        return this.items().length;
    }

    getSafeMaxSelectable(): number {
        return Math.max(1, this.getMaxSelectable());
    }

    getMaxAnswered(): number {
        return this.answeredRequests().length;
    }
}
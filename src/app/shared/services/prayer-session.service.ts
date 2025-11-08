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
        const scopedTopicIds = this.getScopedTopicIds(lid);
        const scopedTopics = this.getScopedTopics(scopedTopicIds);
        const scopedRequests = this.getScopedRequests(scopedTopics);
        const emptyTopics = this.getEmptyTopics(scopedTopics);
        const sortedRequests = this.sortRequestsByPriority(scopedRequests);

        // Build ItemVm array from sorted requests
        const items: ItemVm[] = [];
        for (const request of sortedRequests) {
            items.push(this.buildRequestItemVm(request, scopedTopics));
        }

        // Put topics with no requests after sorted requests (preserve earlier behavior)
        for (const topic of emptyTopics) {
            items.push(this.buildTopicItemVm(topic));
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
        const shuffle = this.settings.shuffleRequests();
        const sessionStarted = this.sessionStartedSignal();

        // Get scoped data
        const scopedTopicIds = this.getScopedTopicIds(lid);
        const scopedTopics = this.getScopedTopics(scopedTopicIds);
        const scopedRequests = this.getScopedRequests(scopedTopics);
        const emptyTopics = this.getEmptyTopics(scopedTopics);

        // Compute ids to detect list changes
        const ids = [...scopedRequests.map(r => r.id), ...emptyTopics.map(t => t.id)].sort().join(',');

        if ((this.lastIds !== ids || this.lastShuffle !== shuffle) && !sessionStarted) {
            this.lastIds = ids;
            this.lastShuffle = shuffle;

            if (shuffle) {
                // Create weighted items, shuffle, and deduplicate
                const weighted = this.buildWeightedItems(scopedRequests, emptyTopics, scopedTopics);
                const shuffled = this.shuffleArray(weighted);
                const deduped = this.deduplicateRequests(shuffled);
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

    // Private helper methods
    private getScopedTopicIds(listId?: number): number[] {
        const allTopics = this.topics();

        if (listId) {
            // If a listId is provided, reduce scope to that list's topics
            const list = this.lists().find((l: List) => l.id === listId);
            return list?.topicIds || [];
        } else {
            // When praying for all lists, exclude topics from lists marked as excludeFromAll
            const excludedListIds = new Set(this.lists().filter((l: List) => l.excludeFromAll).map((l: List) => l.id));
            return allTopics
                .filter((t: Topic) => {
                    // Find which list this topic belongs to
                    const topicList = this.lists().find((l: List) => (l.topicIds || []).includes(t.id));
                    return topicList && !excludedListIds.has(topicList.id);
                })
                .map((t: Topic) => t.id);
        }
    }

    private getScopedTopics(topicIds: number[]): Topic[] {
        const allTopics = this.topics();
        const topicSet = new Set(topicIds);
        return allTopics.filter((t: Topic) => topicSet.has(t.id));
    }

    private getScopedRequests(scopedTopics: Topic[]): RequestEntity[] {
        const allRequests = this.requests();
        const requestIdSet = new Set<number>();

        return allRequests.map((r: RequestEntity) => ({
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
    }

    private getEmptyTopics(scopedTopics: Topic[]): Topic[] {
        return scopedTopics.filter((t: Topic) => (t.requestIds || []).length === 0);
    }

    private sortRequestsByPriority(requests: RequestEntity[]): RequestEntity[] {
        // Non-shuffle: sort requests by priority*10 - prayerCount (desc)
        const scored = requests.map((r: RequestEntity) => ({
            r,
            score: (Number(r.priority) || 1) * 10 - (Number(r.prayerCount) || 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.map(item => item.r);
    }

    private buildRequestItemVm(request: RequestEntity, scopedTopics: Topic[]): ItemVm {
        const ownerTopic = scopedTopics.find(t => (t.requestIds || []).includes(request.id));
        const ownerList = this.lists().find(l => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));

        return {
            kind: 'request',
            id: request.id,
            description: request.description,
            listName: ownerList?.name,
            topicName: ownerTopic?.name,
            createdDate: request.createdDate,
            priority: request.priority,
            prayerCount: request.prayerCount
        };
    }

    private buildTopicItemVm(topic: Topic): ItemVm {
        const ownerList = this.lists().find(l => (l.topicIds || []).includes(topic.id));
        return { kind: 'topic', id: topic.id, name: topic.name, listName: ownerList?.name };
    }

    private buildWeightedItems(scopedRequests: RequestEntity[], emptyTopics: Topic[], scopedTopics: Topic[]): ItemVm[] {
        const weighted: ItemVm[] = [];

        // Add requests weighted by priority
        for (const r of scopedRequests) {
            const repeats = Math.max(1, Number(r.priority) || 1);
            for (let i = 0; i < repeats; i++) {
                weighted.push(this.buildRequestItemVm(r, scopedTopics));
            }
        }

        // Add empty topics
        for (const t of emptyTopics) {
            weighted.push(this.buildTopicItemVm(t));
        }

        return weighted;
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private deduplicateRequests(items: ItemVm[]): ItemVm[] {
        const seenReq = new Set<number>();
        const deduped: ItemVm[] = [];

        for (const item of items) {
            if (item.kind === 'topic') {
                deduped.push(item);
                continue;
            }
            if (!seenReq.has(item.id)) {
                seenReq.add(item.id);
                deduped.push(item);
            }
        }

        return deduped;
    }
}
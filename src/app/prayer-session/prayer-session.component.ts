import { Component, Input, Output, EventEmitter, computed, inject, ViewChild, ElementRef, OnDestroy, AfterViewInit, effect, signal, EffectRef, DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { selectAllRequests } from '../store/requests/request.selectors';
import { selectAllTopics } from '../store/topics/topic.selectors';
import { selectAllLists } from '../store/lists/list.selectors';
import { SettingsService } from '../shared/services/settings.service';
import { PrayerStats } from '../shared/services/prayer-stats';
import { updateRequest, addRequestWithId } from '../store/requests/request.actions';
import { updateTopic } from '../store/topics/topic.actions';
import { PrayerCardComponent } from './prayer-card/prayer-card.component';
import { StatsCard } from './stats-card/stats-card';
import { TimerService } from '../shared/services/timer.service';
import { CarouselService } from '../shared/services/carousel.service';
import { PrayerSessionItem } from '../shared/models/prayer-session.interface';
import { WakeLockService } from '../shared/services/wake-lock.service';

const REGISTER_SECONDS = 12; // seconds of viewing a request card to register a prayer

// Utility function for Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

@Component({
    standalone: true,
    selector: 'app-prayer-session',
    imports: [CommonModule, FormsModule, MatListModule, MatIconModule, MatButtonModule, MatSliderModule, MatProgressBarModule, PrayerCardComponent, StatsCard],
    templateUrl: './prayer-session.component.html',
    styleUrl: './prayer-session.component.css',
    host: { '[class.fullscreen]': 'fullScreen' }
})
export class PrayerSessionComponent implements AfterViewInit, OnDestroy {
    private readonly store = inject(Store);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly settings = inject(SettingsService);
    private readonly timerService = inject(TimerService);
    private readonly carouselService = inject(CarouselService);
    private readonly injector = inject(Injector);
    private readonly wake = inject(WakeLockService);
    readonly prayerStats = inject(PrayerStats);
    private readonly destroyRef = inject(DestroyRef);

    // Effect references for proper cleanup
    private updateShuffledEffectRef?: EffectRef;
    private syncEffectRef?: EffectRef;
    private measureEffectRef?: EffectRef;

    @Input() listId?: number;
    @Input() fullScreen = false;
    @Output() close = new EventEmitter<void>();

    lists = this.store.selectSignal(selectAllLists);
    topics = this.store.selectSignal(selectAllTopics);
    requests = this.store.selectSignal(selectAllRequests);

    answeredRequests = computed(() => this.requests().filter(r => r.answeredDate && !r.archived));
    archivedRequests = computed(() => this.requests().filter(r => r.archived));
    totalRequestsCompleted = computed(() => this.answeredRequests().length + this.archivedRequests().length);

    listIdFromRoute = computed(() => Number(this.route.snapshot.paramMap.get('listId')) || undefined);
    effectiveListId = computed(() => this.listId ?? this.listIdFromRoute());

    // Combined list of items to pray for: requests, plus topics with no requests
    baseItems = computed(() => {
        const archivingItems = this.archivingItems(); // Ensure reactivity
        const lid = this.effectiveListId();
        const allTopics = this.topics();
        const allRequests = this.requests();

        // If a listId is provided, reduce scope to that list's topics
        let scopedTopicIds: number[] | undefined;
        if (lid) {
            const list = this.lists().find(l => l.id === lid);
            scopedTopicIds = list?.topicIds || [];
        } else {
            // When praying for all lists, exclude topics from lists marked as excludeFromAll
            const excludedListIds = new Set(this.lists().filter(l => l.excludeFromAll).map(l => l.id));
            scopedTopicIds = allTopics
                .filter(t => {
                    // Find which list this topic belongs to
                    const topicList = this.lists().find(l => (l.topicIds || []).includes(t.id));
                    return topicList && !excludedListIds.has(topicList.id);
                })
                .map(t => t.id);
        }

        // Build a set of scoped topics
        const topicSet = new Set(scopedTopicIds ?? allTopics.map(t => t.id));
        const scopedTopics = allTopics.filter(t => topicSet.has(t.id));

        // Requests within the scoped topics
        const requestIdSet = new Set<number>();
        const scopedRequests = allRequests.map(r => ({
            ...r,
            // Default missing priority to 1 for backward compatibility
            priority: (r as any).priority ?? 1,
        })).filter(r => {
            // Find topics that include this request id
            // Avoid repeated includes by building set once
            if (requestIdSet.has(r.id)) return true;
            const belongs = scopedTopics.some(t => (t.requestIds || []).includes(r.id));
            if (belongs) requestIdSet.add(r.id);
            return belongs && !r.answeredDate && (r.archived !== true || archivingItems.has(r.id));
        });

        // Topics with no requests within scope
        const emptyTopics = scopedTopics.filter(t => (t.requestIds || []).length === 0);

        // Non-shuffle: sort requests by priority*10 - prayerCount (desc)
        const scored = scopedRequests.map(r => ({
            r,
            score: (Number(r.priority) || 1) * 10 - (Number(r.prayerCount) || 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        const items: PrayerSessionItem[] = [];
        const { topicToListMap, requestToTopicMap } = this.ownerMaps();

        for (const { r } of scored) {
            const ownerTopic = requestToTopicMap.get(r.id);
            const ownerList = ownerTopic ? topicToListMap.get(ownerTopic.id) : undefined;
            items.push(this.createRequestItem(r, ownerTopic, ownerList));
        }

        // Put topics with no requests after sorted requests (preserve earlier behavior)
        for (const t of emptyTopics) {
            const ownerList = topicToListMap.get(t.id);
            items.push(this.createTopicItem(t, ownerList));
        }
        return items;
    });

    // Shuffled or sorted items, fixed for the session
    shuffledItems = signal<PrayerSessionItem[]>([]);
    private lastIds = '';
    private lastShuffle = false;
    private readonly sessionStarted = signal(false);
    private readonly sessionStartTime = signal<number | null>(null);
    readonly archivingItems = signal<Set<number>>(new Set());

    // Computed owner maps for better performance - memoized
    private ownerMaps = computed(() => {
        const lists = this.lists();
        const topics = this.topics();

        const topicToListMap = new Map<number, typeof lists[0]>();
        const requestToTopicMap = new Map<number, typeof topics[0]>();

        for (const list of lists) {
            for (const topicId of list.topicIds || []) {
                topicToListMap.set(topicId, list);
            }
        }

        for (const topic of topics) {
            for (const requestId of topic.requestIds || []) {
                requestToTopicMap.set(requestId, topic);
            }
        }

        return { topicToListMap, requestToTopicMap };
    });

    // Helper to create request item with proper typing and error handling
    private createRequestItem(request: any, ownerTopic?: any, ownerList?: any): PrayerSessionItem {
        if (!request?.id || !request?.description) {
            console.warn('Invalid request data:', request);
            return {
                kind: 'request',
                id: request?.id || 0,
                description: request?.description || 'Unknown request',
                listName: ownerList?.name,
                topicName: ownerTopic?.name,
                createdDate: request?.createdDate,
                priority: Number(request?.priority) || 1,
                prayerCount: Number(request?.prayerCount) || 0
            };
        }

        return {
            kind: 'request',
            id: request.id,
            description: request.description,
            listName: ownerList?.name,
            topicName: ownerTopic?.name,
            createdDate: request.createdDate,
            priority: Number(request.priority) || 1,
            prayerCount: Number(request.prayerCount) || 0,
            isAnswered: Boolean(request.answeredDate && !request.archived),
            answeredDate: request.answeredDate,
            answerDescription: request.answerDescription
        };
    }

    // Helper to create topic item with proper typing and error handling
    private createTopicItem(topic: any, ownerList?: any): PrayerSessionItem {
        if (!topic?.id || !topic?.name) {
            console.warn('Invalid topic data:', topic);
            return {
                kind: 'topic',
                id: topic?.id || 0,
                name: topic?.name || 'Unknown topic',
                listName: ownerList?.name
            };
        }

        return {
            kind: 'topic',
            id: topic.id,
            name: topic.name,
            listName: ownerList?.name
        };
    }

    // Update shuffledItems only when the list changes and session hasn't started
    private initializeUpdateShuffledEffect() {
        this.updateShuffledEffectRef = effect(() => {
            const lid = this.effectiveListId();
            const allTopics = this.topics();
            const allRequests = this.requests();
            const shuffle = this.settings.shuffleRequests();

            // Compute ids to detect list changes
            let scopedTopicIds: number[] | undefined;
            if (lid) {
                const list = this.lists().find(l => l.id === lid);
                scopedTopicIds = list?.topicIds || [];
            } else {
                // When praying for all lists, exclude topics from lists marked as excludeFromAll
                const excludedListIds = new Set(this.lists().filter(l => l.excludeFromAll).map(l => l.id));
                scopedTopicIds = allTopics
                    .filter(t => {
                        // Find which list this topic belongs to
                        const topicList = this.lists().find(l => (l.topicIds || []).includes(t.id));
                        return topicList && !excludedListIds.has(topicList.id);
                    })
                    .map(t => t.id);
            }
            const topicSet = new Set(scopedTopicIds ?? allTopics.map(t => t.id));
            const scopedTopics = allTopics.filter(t => topicSet.has(t.id));
            const scopedRequests = allRequests.filter(r => scopedTopics.some(t => (t.requestIds || []).includes(r.id)) && !r.answeredDate && !r.archived);
            const emptyTopics = scopedTopics.filter(t => (t.requestIds || []).length === 0);
            const ids = [...scopedRequests.map(r => r.id), ...emptyTopics.map(t => t.id)].sort().join(',');

            if ((this.lastIds !== ids || this.lastShuffle !== shuffle) && !this.sessionStarted()) {
                this.lastIds = ids;
                this.lastShuffle = shuffle;
                this.timerService.getCountdownStarted().set(false); // Reset countdown flag for new session

                if (shuffle) {
                    // Expand requests by priority, include topics as single items
                    const weighted: PrayerSessionItem[] = [];
                    const { topicToListMap, requestToTopicMap } = this.ownerMaps();

                    for (const r of scopedRequests) {
                        const ownerTopic = requestToTopicMap.get(r.id);
                        const ownerList = ownerTopic ? topicToListMap.get(ownerTopic.id) : undefined;
                        const repeats = Math.max(1, Number(r.priority) || 1);
                        const requestItem = this.createRequestItem(r, ownerTopic, ownerList);

                        for (let i = 0; i < repeats; i++) {
                            weighted.push(requestItem);
                        }
                    }

                    for (const t of emptyTopics) {
                        const ownerList = topicToListMap.get(t.id);
                        weighted.push(this.createTopicItem(t, ownerList));
                    }

                    // Fisher-Yates shuffle
                    const shuffled = shuffleArray(weighted);

                    // Deduplicate by request id (keep first occurrence), topics are unique
                    const seenReq = new Set<number>();
                    const deduped: PrayerSessionItem[] = [];
                    for (const item of shuffled) {
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
    }

    // Final items with updated data from current requests
    items = computed(() => {
        const shuffled = this.shuffledItems();
        const currentRequests = this.requests();
        return shuffled.filter(item => {
            if (item.kind === 'request') {
                const current = currentRequests.find(r => r.id === item.id);
                return current && !current.archived;
            }
            return true; // Keep topic items
        }).map(item => {
            if (item.kind === 'request') {
                const current = currentRequests.find(r => r.id === item.id);
                if (current) {
                    // Update all request properties that might have changed
                    return {
                        ...item,
                        description: current.description,
                        prayerCount: current.prayerCount,
                        priority: current.priority || 1,
                        isAnswered: Boolean(current.answeredDate && !current.archived),
                        answeredDate: current.answeredDate || undefined,
                        answerDescription: current.answerDescription
                    };
                }
            }
            return item;
        });
    });

    // UI state for carousel and session
    @ViewChild('carousel', { static: false }) carousel?: ElementRef<HTMLDivElement>;
    @ViewChild('track', { static: false }) track?: ElementRef<HTMLDivElement>;
    @ViewChild('bar', { static: false }) bar?: ElementRef<HTMLElement>;
    @ViewChild('footer', { static: false }) footer?: ElementRef<HTMLElement>;
    currentIndex = this.carouselService.getCurrentIndex();
    private scrollDebounceId?: any;
    isDragging = this.carouselService.getIsDragging();
    deltaX = this.carouselService.getDeltaX();
    containerWidth = this.carouselService.getContainerWidth();
    slideWidth = this.carouselService.getSlideWidth();
    stepSize = this.carouselService.getStepSize();
    viewportHeight = this.carouselService.getViewportHeight();

    // Selection sliders
    get maxSelectable(): number { return this.items().length; }
    get safeMaxSelectable(): number { return Math.max(1, this.maxSelectable); }
    get maxAnswered(): number { return this.answeredRequests().length; }
    selectCount = signal<number>(this.settings.praySelectCount() || this.maxSelectable);
    get selectCountModel(): number { return this.selectCount(); }
    set selectCountModel(v: number) { this.onSelectCountChange(v); }

    // Time slider: 1..61, 61 = unlimited. Initialize from settings (default handled in service)
    timeValue = signal<number>(this.settings.prayTimeValue() ?? 60);
    get timeValueModel(): number { return this.timeValue(); }
    set timeValueModel(v: number) { this.onTimeChange(v); }
    get unlimited(): boolean { return this.timeValue() >= 61; }
    get timeMinutes(): number { return Math.min(this.timeValue(), 60); }

    // Answered slider: 0..max answered requests
    answeredValue = signal<number>(this.settings.prayAnsweredCount() ?? 0);
    get answeredValueModel(): number { return this.answeredValue(); }
    set answeredValueModel(v: number) { this.onAnsweredChange(v); }

    selectedItems = signal<PrayerSessionItem[]>([]);

    // Answer dialog
    showAnswerDialog = signal(false);
    answerDialogText = signal('');
    answerDialogTitle = signal('');
    onAnswerSave: ((text: string) => void) | null = null;
    onAnswerCancel: (() => void) | null = null;

    private computeSelectedItems(): PrayerSessionItem[] {
        try {
            const all = this.items();
            const count = this.selectCount();
            let selected: PrayerSessionItem[] = [];

            if (!all || all.length === 0) return selected;

            // Prepend answered requests if any
            const answeredCount = this.answeredValue();
            if (answeredCount > 0) {
                const answeredReqs = this.answeredRequests();
                if (answeredReqs.length > 0) {
                    // Shuffle and take the first answeredCount
                    const shuffledAnswered = shuffleArray(answeredReqs).slice(0, answeredCount);

                    const { topicToListMap, requestToTopicMap } = this.ownerMaps();

                    const answeredItems: PrayerSessionItem[] = shuffledAnswered.map(r => {
                        const ownerTopic = requestToTopicMap.get(r.id);
                        const ownerList = ownerTopic ? topicToListMap.get(ownerTopic.id) : undefined;

                        return {
                            ...this.createRequestItem(r, ownerTopic, ownerList),
                            isAnswered: true,
                            answeredDate: r.answeredDate || undefined,
                            answerDescription: r.answerDescription
                        };
                    });
                    selected = selected.concat(answeredItems);
                }
            }

            // Then add the regular items
            const regularItemsCount = Math.max(1, count);
            const regularItems = count >= all.length ? all : all.slice(0, regularItemsCount);
            selected = selected.concat(regularItems);

            return selected;
        } catch (error) {
            console.error('Error computing selected items:', error);
            return [];
        }
    }

    // Keep selection count in sync with items length without overriding user choice unnecessarily
    private initializeSyncEffect() {
        this.syncEffectRef = effect(() => {
            const max = this.items().length;
            const cur = this.selectCount();
            if (max <= 0) {
                if (cur !== 0) this.selectCount.set(0);
                return;
            }
            if (cur < 1 || cur > max) {
                this.selectCount.set(max);
            }
        });
    }

    private initializeSelectedItemsEffect() {
        effect(() => {
            this.selectCount();
            if (this.isInitialized()) return;
            this.selectedItems.set(this.computeSelectedItems());
        });
        effect(() => {
            this.answeredValue();
            if (this.isInitialized()) return;
            this.selectedItems.set(this.computeSelectedItems());
        });
        effect(() => {
            this.items();
            if (this.isInitialized()) return;
            this.selectedItems.set(this.computeSelectedItems());
        });
    }

    // Countdown timer
    countdownSeconds = this.timerService.getCountdownSeconds();
    initialCountdownSeconds = this.timerService.getInitialCountdownSeconds();
    sessionDuration = computed(() => {
        const final = this.finalSessionDuration();
        if (final !== null) return final;

        if (this.unlimited) {
            const start = this.sessionStartTime();
            return start ? Math.floor(Date.now() / 1000 - start) : 0;
        } else {
            return this.initialCountdownSeconds() - this.countdownSeconds();
        }
    });
    finalPrayerCountValue = computed(() => {
        const final = this.finalPrayerCount();
        return final !== null ? final : this.timerService.getSessionPrayerCount();
    });
    private finalSessionDuration = signal<number | null>(null);
    private finalPrayerCount = signal<number | null>(null);
    private sessionCounted = new Set<number>();
    private isInitialized = signal(false);

    constructor() {
        // Initialize effects with proper cleanup
        this.initializeUpdateShuffledEffect();
        this.initializeSyncEffect();
        this.initializeSelectedItemsEffect();

        // Reset carousel to start card for new prayer session
        this.carouselService.setIndex(0);

        // Reset session state
        this.sessionStarted.set(false);
        this.finalSessionDuration.set(null);
        this.finalPrayerCount.set(null);
        this.sessionCounted.clear();
        this.timerService.resetSessionCounted();
    }

    ngAfterViewInit(): void {
        this.initializeCarousel();
        this.initializeMeasureEffect();
        this.isInitialized.set(true);
    }

    // Answer dialog methods
    openAnswerDialog(data: { text: string, title: string, onSave: (text: string) => void, onCancel: () => void }) {
        this.answerDialogText.set(data.text);
        this.answerDialogTitle.set(data.title);
        this.onAnswerSave = data.onSave;
        this.onAnswerCancel = data.onCancel;
        this.showAnswerDialog.set(true);
    }

    closeAnswerDialog() {
        this.showAnswerDialog.set(false);
        this.answerDialogText.set('');
        this.onAnswerSave = null;
        this.onAnswerCancel = null;
    }

    onSaveAnswer() {
        if (this.onAnswerSave) {
            this.onAnswerSave(this.answerDialogText().trim());
        }
        this.closeAnswerDialog();
    }

    private initializeCarousel() {
        try {
            if (this.carousel && this.track) {
                this.carouselService.initialize(this.carousel, this.track, {
                    items: this.selectedItems()
                });
            }
        } catch (error) {
            console.error('Error initializing carousel:', error);
        }
    }

    private initializeMeasureEffect() {
        this.measureEffectRef = runInInjectionContext(this.injector, () => {
            return effect(() => {
                const itemCount = this.selectedItems().length;
                const footerVisible = this.currentIndex() >= 1;
                // Use a debounced timeout to avoid excessive re-initialization
                if (this.scrollDebounceId) {
                    clearTimeout(this.scrollDebounceId);
                }

                this.scrollDebounceId = setTimeout(() => {
                    this.initializeCarousel();
                }, 50); // Small delay to batch updates
            });
        });
    }

    ngOnDestroy(): void {
        // Clean up effects
        this.updateShuffledEffectRef?.destroy();
        this.syncEffectRef?.destroy();
        this.measureEffectRef?.destroy();

        // Clean up services
        this.carouselService.destroy();
        this.timerService.destroy();

        // Clear any remaining timeouts
        if (this.scrollDebounceId) {
            clearTimeout(this.scrollDebounceId);
        }
    }

    onPointerDown(ev: PointerEvent) {
        try {
            this.carouselService.onPointerDown(ev);
        } catch (error) {
            console.error('Error handling pointer down:', error);
        }
    }

    onPointerMove(ev: PointerEvent) {
        try {
            this.carouselService.onPointerMove(ev);
        } catch (error) {
            console.error('Error handling pointer move:', error);
        }
    }

    onPointerUp(ev: PointerEvent) {
        try {
            const maxIndex = this.selectedItems().length + 1; // +1 for stats slide
            const newIndex = this.carouselService.onPointerUp(ev, maxIndex);
            this.setIndex(newIndex);
        } catch (error) {
            console.error('Error handling pointer up:', error);
        }
    }

    setIndex(idx: number) {
        try {
            const selectedItemsLength = this.selectedItems().length;
            const clamped = Math.max(0, Math.min(idx, selectedItemsLength + 1)); // +1 for stats slide

            this.carouselService.setIndex(clamped);

            // Mark session as started when user begins praying
            if (clamped >= 1 && !this.sessionStarted()) {
                this.sessionStarted.set(true);
                this.sessionStartTime.set(Date.now() / 1000);
                if (this.settings.keepAwake()) {
                    this.wake.request();
                }
            }

            // Start countdown when first request appears (only once per session)
            if (clamped === 1 && !this.timerService.getCountdownStarted()()) {
                this.startCountdownIfNeeded();
            }

            this.handleViewTimer();

            // Snapshot session duration when reaching stats slide
            if (clamped === selectedItemsLength + 1 && this.finalSessionDuration() === null) {
                this.finalSessionDuration.set(this.sessionDuration());
                this.finalPrayerCount.set(this.timerService.getSessionPrayerCount());

                // Update cumulative stats
                this.prayerStats.addSessionTime(this.sessionDuration());
                this.prayerStats.addSessionRequestsPrayed(this.selectedItems().length);
                this.prayerStats.addSession();
            }
        } catch (error) {
            console.error('Error setting index:', error);
        }
    }

    private startCountdownIfNeeded() {
        try {
            this.timerService.startCountdown({
                timeMinutes: this.timeMinutes,
                unlimited: this.unlimited,
                onExpire: () => {
                    // Advance to stats card when timer expires
                    const statsIndex = this.selectedItems().length + 1;
                    this.setIndex(statsIndex);
                }
            });
        } catch (error) {
            console.error('Error starting countdown:', error);
        }
    }

    private handleViewTimer() {
        try {
            const idx = this.currentIndex();
            if (idx < 1) return;

            const selectedItems = this.selectedItems();
            const item = selectedItems[idx - 1];

            if (!item || item.kind !== 'request' || item.isAnswered) return;
            if (this.sessionCounted.has(item.id)) return;

            this.timerService.startViewTimer(
                item.id,
                idx,
                selectedItems,
                REGISTER_SECONDS,
                (itemId: number) => {
                    this.handlePrayerCountIncrement(itemId);
                }
            );
        } catch (error) {
            console.error('Error handling view timer:', error);
        }
    }

    private handlePrayerCountIncrement(itemId: number) {
        try {
            const currentItem = this.selectedItems().find(i => i.kind === 'request' && i.id === itemId);
            if (currentItem && currentItem.kind === 'request') {
                this.sessionCounted.add(itemId);
                const newCount = (currentItem.prayerCount || 0) + 1;
                this.store.dispatch(updateRequest({
                    id: itemId,
                    changes: { prayerCount: newCount }
                }));
            }
        } catch (error) {
            console.error('Error incrementing prayer count:', error);
        }
    }

    onSelectCountChange(val: number) {
        const max = this.maxSelectable;
        const v = Math.max(1, Math.min(val, max));
        this.selectCount.set(v);
        // persist
        this.settings.setPraySelectCount(v);
        // Clamp index if beyond new selection length
        const maxIndex = this.selectedItems().length;
        if (this.currentIndex() > maxIndex) this.setIndex(maxIndex);
    }

    onTimeChange(val: number) {
        // expect 1..61, where 61 = unlimited
        const v = Math.max(1, Math.min(val, 61));
        this.timeValue.set(v);
        // persist
        this.settings.setPrayTimeValue(v);
    }

    onAnsweredChange(val: number) {
        const max = this.answeredRequests().length;
        const v = Math.max(0, Math.min(val, max));
        this.answeredValue.set(v);
        // persist
        this.settings.setPrayAnsweredCount(v);
    }

    formatCountLabel(): string {
        const max = this.maxSelectable;
        const v = this.selectCount();
        return v >= max ? 'All items' : String(v);
    }

    formatTimeLabel(): string {
        if (this.unlimited) return 'Unlimited';
        const m = this.timeMinutes;
        return `${m} min`;
    }

    formatAnsweredLabel(): string {
        const v = this.answeredValue();
        if (v === 0) return 'None';
        return String(v);
    }

    progressPercent(): number {
        return this.carouselService.getProgressPercent(this.selectedItems());
    }

    timeProgressPercent(): number {
        return this.timerService.getTimeProgressPercent();
    }

    formatRemaining(): string {
        return this.timerService.formatRemaining();
    }

    carouselTransform(): string {
        return this.carouselService.getCarouselTransform();
    }

    get totalSlides(): number {
        return this.carouselService.getTotalSlides(this.selectedItems());
    }

    get currentSlide(): number {
        return this.carouselService.getCurrentSlide(this.selectedItems());
    }

    onRequestAnswered(requestId: number, event: { answerDescription: string }) {
        try {
            this.store.dispatch(updateRequest({
                id: requestId,
                changes: {
                    answeredDate: new Date().toISOString(),
                    answerDescription: event.answerDescription
                }
            }));

            // Update cumulative answered count
            this.prayerStats.addRequestsAnswered(1);
        } catch (error) {
            console.error('Error updating answered request:', error);
        }
    }

    onTitleEdited(requestId: number, newTitle: string) {
        try {
            this.store.dispatch(updateRequest({
                id: requestId,
                changes: {
                    description: newTitle
                }
            }));
        } catch (error) {
            console.error('Error updating request title:', error);
        }
    }

    onRequestArchived(requestId: number) {
        // Archive the request - the items computed will automatically filter it out
        this.store.dispatch(updateRequest({
            id: requestId,
            changes: { archived: true }
        }));
    }

    onRequestArchiveButton(requestId: number) {
        // Simply archive the request - the card animation will handle the visual feedback
        this.store.dispatch(updateRequest({
            id: requestId,
            changes: { archived: true }
        }));
    }

    onAddNewRequest(event: { topicName: string; description: string }, index: number) {
        const topicName = event.topicName;
        const description = event.description;
        // Find the topic
        const topic = this.topics().find(t => t.name === topicName);
        if (topic) {
            // Determine next request id
            const nextId = this.requests().length ? Math.max(...this.requests().map(r => r.id)) + 1 : 1;
            // Add the request
            this.store.dispatch(addRequestWithId({ id: nextId, description }));
            // Update the topic's requestIds
            const requestIds = Array.from(new Set([...(topic.requestIds || []), nextId]));
            this.store.dispatch(updateTopic({ id: topic.id, changes: { requestIds } }));

            // Create the new item
            const ownerList = this.lists().find(l => (l.topicIds || []).includes(topic.id));
            const newItem: PrayerSessionItem = {
                kind: 'request',
                id: nextId,
                description,
                topicName: topic.name,
                listName: ownerList?.name,
                createdDate: new Date().toISOString(),
                priority: 1,
                prayerCount: 0
            };

            // Insert into selectedItems at the index after the clicked card
            this.selectedItems.update(items => [
                ...items.slice(0, index + 1),
                newItem,
                ...items.slice(index + 1)
            ]);
        }
    }

    onClose() {
        try {
            // In overlay (fullscreen) mode, emit close event; otherwise navigate home
            if (this.fullScreen) {
                this.close.emit();
                return;
            }
            this.router.navigate(['/']);
        } catch (error) {
            console.error('Error closing prayer session:', error);
        }
    }
}

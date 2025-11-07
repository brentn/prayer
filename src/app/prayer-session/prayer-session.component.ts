import { Component, Input, Output, EventEmitter, computed, inject, ViewChild, ElementRef, OnDestroy, AfterViewInit, effect, signal } from '@angular/core';
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
import { updateRequest } from '../store/requests/request.actions';
import { PrayerCardComponent } from './prayer-card/prayer-card.component';

const REGISTER_SECONDS = 12; // seconds of viewing a request card to register a prayer

type ItemVm = { kind: 'request', id: number, description: string, listName?: string, topicName?: string, createdDate?: string, prayerCount?: number, priority?: number, isAnswered?: boolean, answeredDate?: string, answerDescription?: string } | { kind: 'topic', id: number, name: string, listName?: string };

@Component({
    standalone: true,
    selector: 'app-prayer-session',
    imports: [CommonModule, FormsModule, MatListModule, MatIconModule, MatButtonModule, MatSliderModule, MatProgressBarModule, PrayerCardComponent],
    templateUrl: './prayer-session.component.html',
    styleUrl: './prayer-session.component.css',
    host: { '[class.fullscreen]': 'fullScreen' }
})
export class PrayerSessionComponent implements AfterViewInit, OnDestroy {
    private store = inject(Store);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private settings = inject(SettingsService);

    @Input() listId?: number;
    @Input() fullScreen = false;
    @Output() close = new EventEmitter<void>();

    lists = this.store.selectSignal(selectAllLists);
    topics = this.store.selectSignal(selectAllTopics);
    requests = this.store.selectSignal(selectAllRequests);

    answeredRequests = computed(() => this.requests().filter(r => r.answeredDate));

    listIdFromRoute = computed(() => Number(this.route.snapshot.paramMap.get('listId')) || undefined);
    effectiveListId = computed(() => this.listId ?? this.listIdFromRoute());

    // Combined list of items to pray for: requests, plus topics with no requests
    baseItems = computed(() => {
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
            return belongs && !r.answeredDate;
        });

        // Topics with no requests within scope
        const emptyTopics = scopedTopics.filter(t => (t.requestIds || []).length === 0);

        // Non-shuffle: sort requests by priority*10 - prayerCount (desc)
        const scored = scopedRequests.map(r => ({
            r,
            score: (Number(r.priority) || 1) * 10 - (Number(r.prayerCount) || 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        const items: ItemVm[] = [];
        for (const { r } of scored) {
            const ownerTopic = scopedTopics.find(t => (t.requestIds || []).includes(r.id));
            const ownerList = this.lists().find(l => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));
            items.push({ kind: 'request', id: r.id, description: r.description, listName: ownerList?.name, topicName: ownerTopic?.name, createdDate: r.createdDate, priority: r.priority, prayerCount: r.prayerCount });
        }
        // Put topics with no requests after sorted requests (preserve earlier behavior)
        for (const t of emptyTopics) {
            const ownerList = this.lists().find(l => (l.topicIds || []).includes(t.id));
            items.push({ kind: 'topic', id: t.id, name: t.name, listName: ownerList?.name });
        }
        return items;
    });

    // Shuffled or sorted items, fixed for the session
    shuffledItems = signal<ItemVm[]>([]);
    private lastIds = '';
    private lastShuffle = false;
    private sessionStarted = signal(false);

    // Update shuffledItems only when the list changes and session hasn't started
    private updateShuffledEffect = effect(() => {
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
        const scopedRequests = allRequests.filter(r => scopedTopics.some(t => (t.requestIds || []).includes(r.id)) && !r.answeredDate);
        const emptyTopics = scopedTopics.filter(t => (t.requestIds || []).length === 0);
        const ids = [...scopedRequests.map(r => r.id), ...emptyTopics.map(t => t.id)].sort().join(',');

        if ((this.lastIds !== ids || this.lastShuffle !== shuffle) && !this.sessionStarted()) {
            this.lastIds = ids;
            this.lastShuffle = shuffle;
            this.countdownStarted.set(false); // Reset countdown flag for new session

            if (shuffle) {
                // Expand requests by priority, include topics as single items
                const weighted: ItemVm[] = [];
                for (const r of scopedRequests) {
                    const ownerTopic = scopedTopics.find(t => (t.requestIds || []).includes(r.id));
                    const ownerList = this.lists().find(l => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));
                    const repeats = Math.max(1, Number(r.priority) || 1);
                    for (let i = 0; i < repeats; i++) {
                        weighted.push({ kind: 'request', id: r.id, description: r.description, listName: ownerList?.name, topicName: ownerTopic?.name, createdDate: r.createdDate, priority: r.priority, prayerCount: r.prayerCount });
                    }
                }
                for (const t of emptyTopics) {
                    const ownerList = this.lists().find(l => (l.topicIds || []).includes(t.id));
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
    items = computed(() => {
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

    // UI state for carousel and session
    @ViewChild('carousel', { static: false }) carousel?: ElementRef<HTMLDivElement>;
    @ViewChild('track', { static: false }) track?: ElementRef<HTMLDivElement>;
    @ViewChild('bar', { static: false }) bar?: ElementRef<HTMLElement>;
    @ViewChild('footer', { static: false }) footer?: ElementRef<HTMLElement>;
    currentIndex = signal(0); // 0 = settings slide; >=1 means items
    private scrollDebounceId?: any;
    isDragging = false;
    private startX = 0;
    private measureRef?: () => void;
    deltaX = signal(0);
    containerWidth = signal(0);
    slideWidth = signal(0);
    private readonly peek = 16; // pixels to show next/prev card edges
    private readonly slideGap = 12; // space between slides in px
    stepSize = signal(0); // measured slide width + gap in px
    viewportHeight = signal(0);

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

    selectedItems = computed(() => {
        const all = this.items();
        const count = this.selectCount();
        let selected: ItemVm[] = [];
        if (!all || all.length === 0) return selected;

        // Prepend answered requests if any
        const answeredCount = this.answeredValue();
        if (answeredCount > 0) {
            const answeredReqs = this.answeredRequests();
            // Shuffle and take the first answeredCount
            const shuffledAnswered = [...answeredReqs].sort(() => Math.random() - 0.5).slice(0, answeredCount);
            // Convert to ItemVm
            const answeredItems: ItemVm[] = shuffledAnswered.map(r => {
                const ownerTopic = this.topics().find(t => (t.requestIds || []).includes(r.id));
                const ownerList = this.lists().find(l => ownerTopic && (l.topicIds || []).includes(ownerTopic.id));
                return {
                    kind: 'request' as const,
                    id: r.id,
                    description: r.description,
                    listName: ownerList?.name,
                    topicName: ownerTopic?.name,
                    createdDate: r.createdDate,
                    prayerCount: r.prayerCount,
                    priority: r.priority,
                    isAnswered: true,
                    answeredDate: r.answeredDate || undefined,
                    answerDescription: r.answerDescription
                };
            });
            selected = selected.concat(answeredItems);
        }

        // Then add the regular items
        if (count >= all.length) {
            selected = selected.concat(all);
        } else {
            selected = selected.concat(all.slice(0, Math.max(1, count)));
        }

        return selected;
    });

    // Keep selection count in sync with items length without overriding user choice unnecessarily
    private syncEffect = effect(() => {
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

    // Countdown timer
    countdownSeconds = signal<number>(0);
    initialCountdownSeconds = signal<number>(0);
    countdownStarted = signal<boolean>(false);
    private countdownId?: any;
    private sessionCounted = new Set<number>();
    private viewTimerId?: any;

    ngAfterViewInit(): void {
        const measure = () => {
            const vp = this.carousel?.nativeElement;
            const w = vp?.clientWidth || window.innerWidth;
            this.containerWidth.set(w);

            const trackEl = this.track?.nativeElement;
            const slides = trackEl?.querySelectorAll<HTMLElement>('.slide') || [] as any;
            let slideW = w;
            let step = w;
            if (slides && (slides as any).length) {
                const rect0 = (slides as any)[0].getBoundingClientRect();
                slideW = rect0.width || w;
                if ((slides as any).length >= 2) {
                    const rect1 = (slides as any)[1].getBoundingClientRect();
                    step = Math.abs(rect1.left - rect0.left) || (slideW);
                } else {
                    const styles = trackEl ? getComputedStyle(trackEl) : undefined;
                    const gap = styles ? parseFloat((styles as any).columnGap || (styles as any).gap || '0') : this.slideGap;
                    step = slideW + (isNaN(gap) ? 0 : gap);
                }
            }
            this.slideWidth.set(slideW);
            this.stepSize.set(step);

            const headerH = this.bar?.nativeElement?.offsetHeight || 0;
            const footerH = this.footer?.nativeElement?.offsetHeight || 0;
            // section vertical padding approx 24px; leave a small margin
            const viewH = Math.max(200, window.innerHeight - headerH - footerH - 24);
            this.viewportHeight.set(viewH);
        };
        this.measureRef = measure;
        measure();
        // Re-measure on next frame to capture final layout (avoids early partial widths)
        requestAnimationFrame(() => measure());
        window.addEventListener('resize', measure);
        // Re-measure when the number of slides changes
        effect(() => {
            const _ = this.selectedItems().length;
            setTimeout(() => measure(), 0);
        });
    }

    ngOnDestroy(): void {
        if (this.measureRef) window.removeEventListener('resize', this.measureRef);
        if (this.countdownId) clearInterval(this.countdownId);
        if (this.scrollDebounceId) clearTimeout(this.scrollDebounceId);
        if (this.viewTimerId) clearTimeout(this.viewTimerId);
    }

    onPointerDown(ev: PointerEvent) {
        // Don't start swipe when interacting with a slider
        const target = ev.target as HTMLElement;
        if (target.closest('mat-slider')) return;
        this.isDragging = true;
        this.startX = ev.clientX;
        this.deltaX.set(0);
        // avoid pointer capture to let inner controls work naturally
    }

    onPointerMove(ev: PointerEvent) {
        if (!this.isDragging) return;
        const dx = ev.clientX - this.startX;
        this.deltaX.set(dx);
    }

    onPointerUp(ev: PointerEvent) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dx = this.deltaX();
        const w = this.slideWidth() || this.containerWidth() || 1;
        const threshold = Math.max(60, w * 0.15);
        let next = this.currentIndex();
        if (dx <= -threshold) next += 1;
        else if (dx >= threshold) next -= 1;
        const max = this.selectedItems().length; // last slide index == number of items
        next = Math.max(0, Math.min(next, max));
        this.deltaX.set(0);
        this.setIndex(next);
    }

    setIndex(idx: number) {
        const clamped = Math.max(0, Math.min(idx, this.selectedItems().length)); // length because 0 is settings, items start at 1
        if (clamped === this.currentIndex()) return;
        this.currentIndex.set(clamped);
        // Mark session as started when user begins praying
        if (clamped >= 1 && !this.sessionStarted()) {
            this.sessionStarted.set(true);
        }
        // Start countdown when first request appears (only once per session)
        if (clamped === 1 && !this.countdownStarted()) {
            this.startCountdownIfNeeded();
            this.countdownStarted.set(true);
        }
        this.handleViewTimer();
    }

    private startCountdownIfNeeded() {
        if (this.unlimited) return;
        const total = this.timeMinutes * 60;
        this.countdownSeconds.set(total);
        this.initialCountdownSeconds.set(total);
        if (this.countdownId) clearInterval(this.countdownId);
        this.countdownId = setInterval(() => {
            const next = this.countdownSeconds() - 1;
            this.countdownSeconds.set(Math.max(0, next));
            if (next <= 0 && this.countdownId) {
                clearInterval(this.countdownId);
                this.countdownId = undefined;
            }
        }, 1000);
    }

    private handleViewTimer() {
        if (this.viewTimerId) { clearTimeout(this.viewTimerId); this.viewTimerId = undefined; }
        const idx = this.currentIndex();
        if (idx < 1) return; // not on a request card
        const item = this.selectedItems()[idx - 1];
        if (!item || item.kind !== 'request' || item.isAnswered) return;
        if (this.sessionCounted.has(item.id)) return;
        const startId = item.id;
        const startIndex = idx;
        this.viewTimerId = setTimeout(() => {
            // still on the same card?
            const curIdx = this.currentIndex();
            const curItem = this.selectedItems()[curIdx - 1];
            if (curIdx === startIndex && curItem && curItem.kind === 'request' && curItem.id === startId) {
                // Increment once per session
                this.sessionCounted.add(startId);
                const newCount = (curItem.prayerCount || 0) + 1;
                this.store.dispatch(updateRequest({ id: startId, changes: { prayerCount: newCount } }));
            }
        }, 1000 * REGISTER_SECONDS);
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
        const totalSlides = this.selectedItems().length;
        if (totalSlides <= 0) return 0;
        const idx = this.currentIndex();
        if (idx < 1) return 0;
        return Math.min(100, Math.max(0, (idx / totalSlides) * 100));
    }

    timeProgressPercent(): number {
        if (this.unlimited) return 0;
        const initial = this.initialCountdownSeconds();
        const current = this.countdownSeconds();
        if (initial <= 0) return 0;
        const elapsed = initial - current;
        return Math.min(100, Math.max(0, (elapsed / initial) * 100));
    }

    formatRemaining(): string {
        if (this.unlimited) return 'Unlimited';
        const total = this.countdownSeconds();
        if (total >= 60) {
            const m = Math.ceil(total / 60);
            return `${m} min`;
        } else {
            return `${total} sec`;
        }
    }

    carouselTransform(): string {
        const step = this.stepSize() || this.containerWidth();
        const offset = -this.currentIndex() * step + this.deltaX();
        return `translateX(${offset}px)`;
    }

    get totalSlides(): number {
        return this.selectedItems().length;
    }

    get currentSlide(): number {
        const idx = this.currentIndex();
        if (idx < 1) return 0;
        return Math.min(idx, this.totalSlides);
    }

    onRequestAnswered(requestId: number, event: { answerDescription: string }) {
        this.store.dispatch(updateRequest({
            id: requestId,
            changes: {
                answeredDate: new Date().toISOString(),
                answerDescription: event.answerDescription
            }
        }));
    }

    onClose() {
        // In overlay (fullscreen) mode, emit close event; otherwise navigate home
        if (this.fullScreen) { this.close.emit(); return; }
        this.router.navigate(['/']);
    }
}

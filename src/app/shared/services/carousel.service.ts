import { Injectable, signal, ElementRef } from '@angular/core';
import { PrayerSessionItem } from '../models/prayer-session.interface';

export interface CarouselConfig {
    items: PrayerSessionItem[];
    viewportHeight?: number;
}

@Injectable({
    providedIn: 'root'
})
export class CarouselService {
    // Carousel state
    private currentIndex = signal(0);
    private isDragging = signal(false);
    private startX = 0;
    private startY = 0;
    private currentX = 0;
    private deltaX = signal(0);
    private containerWidth = signal(0);
    private slideWidth = signal(0);
    private stepSize = signal(0);
    private viewportHeight = signal(0);
    private animationFrameId: number | null = null;

    // Touch/swipe improvements
    private readonly DRAG_THRESHOLD = 5; // Reduced for more responsive feel
    private readonly SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms for momentum detection
    private readonly SWIPE_DISTANCE_THRESHOLD = 50; // Minimum swipe distance
    private wasDragged = false;
    private dragClearTimeout: any = null;
    private lastMoveTime = 0;
    private lastMoveX = 0;
    private velocity = 0;
    private isVerticalScroll = false;
    private maxIndexValue = 999; // Track max index for rubber-band effect

    // DOM references
    private carousel?: ElementRef<HTMLDivElement>;
    private track?: ElementRef<HTMLDivElement>;
    private measureRef?: () => void;
    private activePointerId: number | null = null;

    // Getters for reactive access
    getCurrentIndex() {
        return this.currentIndex;
    }

    getIsDragging() {
        return this.isDragging;
    }

    getDeltaX() {
        return this.deltaX;
    }

    getContainerWidth() {
        return this.containerWidth;
    }

    getSlideWidth() {
        return this.slideWidth;
    }

    getStepSize() {
        return this.stepSize;
    }

    getViewportHeight() {
        return this.viewportHeight;
    }

    // Initialization
    initialize(carousel: ElementRef<HTMLDivElement>, track: ElementRef<HTMLDivElement>, config: CarouselConfig): void {
        this.carousel = carousel;
        this.track = track;

        const measure = () => {
            const vp = this.carousel?.nativeElement;
            const w = vp?.clientWidth || window.innerWidth;
            this.containerWidth.set(w);

            const trackEl = this.track?.nativeElement;
            const slides = trackEl?.querySelectorAll<HTMLElement>('.slide') || [];
            let slideW = w;
            let step = Math.min(w, 880); // Match prayer card max-width for visual step size
            if (slides.length >= 1) {
                const rect0 = slides[0].getBoundingClientRect();
                slideW = rect0.width || w;
                if (slides.length >= 2) {
                    const rect1 = slides[1].getBoundingClientRect();
                    step = Math.abs(rect1.left - rect0.left) || step;
                } else {
                    step = slideW;
                }
            }
            this.slideWidth.set(slideW);
            this.stepSize.set(step);

            const headerH = 0; // Will be calculated by component
            const footerH = 100; // Always reserve space for footer (approximate height)
            const viewH = Math.max(200, window.innerHeight - headerH - footerH - 24);
            this.viewportHeight.set(viewH);
        };

        this.measureRef = measure;
        measure();
        requestAnimationFrame(() => measure());
        window.addEventListener('resize', measure);
    }

    // Event handlers
    onPointerDown(ev: PointerEvent): void {
        // Don't start swipe when interacting with sliders or other controls
        const target = ev.target as HTMLElement;
        if (target.closest('mat-slider, button, input, textarea, a')) return;

        // Clear any previous drag flag
        this.wasDragged = false;
        this.isVerticalScroll = false;
        if (this.dragClearTimeout) {
            clearTimeout(this.dragClearTimeout);
            this.dragClearTimeout = null;
        }

        // Cancel any in-flight animations
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Capture the pointer for smooth tracking
        this.activePointerId = ev.pointerId;
        try {
            (ev.target as Element)?.setPointerCapture?.(ev.pointerId);
        } catch (e) {
            // Pointer capture not supported, continue anyway
        }

        this.isDragging.set(true);
        this.startX = ev.clientX;
        this.startY = ev.clientY;
        this.currentX = ev.clientX;
        this.lastMoveX = ev.clientX;
        this.lastMoveTime = Date.now();
        this.velocity = 0;
        this.deltaX.set(0);
    }

    onPointerMove(ev: PointerEvent): void {
        if (!this.isDragging()) return;

        // Only process events from the captured pointer
        if (this.activePointerId !== null && ev.pointerId !== this.activePointerId) return;

        const dx = ev.clientX - this.startX;
        const dy = ev.clientY - this.startY;

        // Detect if this is a vertical scroll gesture
        if (!this.wasDragged && !this.isVerticalScroll) {
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > this.DRAG_THRESHOLD) {
                // User is scrolling vertically, not swiping horizontally
                this.isVerticalScroll = true;
                this.isDragging.set(false);
                return;
            }
        }

        if (this.isVerticalScroll) return;

        // Prevent default to stop browser gestures
        if (Math.abs(dx) > this.DRAG_THRESHOLD) {
            ev.preventDefault();
        }

        // Cancel any pending animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Schedule the deltaX update for the next animation frame
        this.animationFrameId = requestAnimationFrame(() => {
            this.currentX = ev.clientX;
            this.deltaX.set(dx);

            // Calculate velocity for momentum detection
            const now = Date.now();
            const timeDelta = now - this.lastMoveTime;
            if (timeDelta > 0) {
                const moveDelta = ev.clientX - this.lastMoveX;
                this.velocity = moveDelta / timeDelta; // px/ms
                this.lastMoveX = ev.clientX;
                this.lastMoveTime = now;
            }

            // Mark as drag if movement exceeds threshold
            if (Math.abs(dx) >= this.DRAG_THRESHOLD) {
                this.wasDragged = true;
            }
            this.animationFrameId = null;
        });
    }

    onPointerUp(ev: PointerEvent, maxIndex: number): number {
        if (!this.isDragging()) return this.currentIndex();

        // Only process events from the captured pointer
        if (this.activePointerId !== null && ev.pointerId !== this.activePointerId) {
            return this.currentIndex();
        }

        // Release pointer capture
        if (this.activePointerId !== null) {
            try {
                (ev.target as Element)?.releasePointerCapture?.(this.activePointerId);
            } catch (e) {
                // Ignore errors
            }
            this.activePointerId = null;
        }

        // Store max index for rubber-band calculations
        this.maxIndexValue = maxIndex;

        // Cancel any pending animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.isDragging.set(false);
        const dx = this.deltaX();
        const w = this.slideWidth() || this.containerWidth() || 1;

        // Use velocity for momentum-based swiping
        const hasVelocity = Math.abs(this.velocity) > this.SWIPE_VELOCITY_THRESHOLD;
        const hasDistance = Math.abs(dx) > this.SWIPE_DISTANCE_THRESHOLD;

        // More responsive threshold: lower distance requirement if velocity is high
        const threshold = hasVelocity ? w * 0.15 : w * 0.25;

        let next = this.currentIndex();

        // Determine direction based on velocity or distance
        if (hasVelocity) {
            // Use velocity direction for quick swipes
            if (this.velocity < -this.SWIPE_VELOCITY_THRESHOLD) next += 1;
            else if (this.velocity > this.SWIPE_VELOCITY_THRESHOLD) next -= 1;
        } else if (hasDistance) {
            // Use distance for slower drags
            if (dx <= -threshold) next += 1;
            else if (dx >= threshold) next -= 1;
        }

        next = Math.max(0, Math.min(next, maxIndex));
        this.deltaX.set(0);
        this.velocity = 0;
        this.isVerticalScroll = false;
        this.setIndex(next);

        // Keep the wasDragged flag briefly to allow click handlers to detect a drag
        if (this.wasDragged) {
            if (this.dragClearTimeout) clearTimeout(this.dragClearTimeout);
            this.dragClearTimeout = setTimeout(() => {
                this.wasDragged = false;
                this.dragClearTimeout = null;
            }, 150);
        }

        return next;
    }

    getWasDragged(): boolean {
        return this.wasDragged;
    }

    setIndex(idx: number): void {
        const clamped = Math.max(0, Math.min(idx, 999)); // Will be clamped by caller
        this.currentIndex.set(clamped);
    }

    setMaxIndex(maxIdx: number): void {
        this.maxIndexValue = maxIdx;
    }

    // Utility methods
    getCarouselTransform(): string {
        const step = this.stepSize() || this.containerWidth();
        let offset = -this.currentIndex() * step + this.deltaX();

        // Add rubber-band effect for over-scroll
        const dx = this.deltaX();
        const idx = this.currentIndex();

        // Dampen movement at boundaries for natural feel
        if (idx === 0 && dx > 0) {
            // At first slide, pulling right - apply resistance
            offset = -idx * step + (dx * 0.3);
        } else if (idx >= this.maxIndexValue && dx < 0) {
            // At last slide, pulling left - apply resistance
            offset = -idx * step + (dx * 0.3);
        }

        // Use translate3d for better hardware acceleration
        return `translate3d(${offset}px, 0, 0)`;
    }

    getTotalSlides(items: PrayerSessionItem[]): number {
        return items.length;
    }

    getCurrentSlide(items: PrayerSessionItem[]): number {
        const idx = this.currentIndex();
        if (idx < 1) return 0;
        return Math.min(idx, items.length);
    }

    getProgressPercent(items: PrayerSessionItem[]): number {
        const totalSlides = items.length;
        if (totalSlides <= 0) return 0;
        const idx = this.currentIndex();
        if (idx < 1) return 0;
        return Math.min(100, Math.max(0, (idx / totalSlides) * 100));
    }

    // Cleanup
    destroy(): void {
        if (this.measureRef) {
            window.removeEventListener('resize', this.measureRef);
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}
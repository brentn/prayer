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
    private isDragging = false;
    private startX = 0;
    private deltaX = signal(0);
    private containerWidth = signal(0);
    private slideWidth = signal(0);
    private stepSize = signal(0);
    private viewportHeight = signal(0);
    private animationFrameId: number | null = null;

    // Small threshold (px) to consider a movement a drag vs a tap
    private readonly DRAG_THRESHOLD = 8;
    private wasDragged = false;
    private dragClearTimeout: any = null;

    // DOM references
    private carousel?: ElementRef<HTMLDivElement>;
    private track?: ElementRef<HTMLDivElement>;
    private measureRef?: () => void;

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
        if (target.closest('mat-slider, button, input')) return;

        // Clear any previous drag flag
        this.wasDragged = false;
        if (this.dragClearTimeout) {
            clearTimeout(this.dragClearTimeout);
            this.dragClearTimeout = null;
        }

        this.isDragging = true;
        this.startX = ev.clientX;
        this.deltaX.set(0);
    }

    onPointerMove(ev: PointerEvent): void {
        if (!this.isDragging) return;

        // Cancel any pending animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Schedule the deltaX update for the next animation frame
        this.animationFrameId = requestAnimationFrame(() => {
            const dx = ev.clientX - this.startX;
            this.deltaX.set(dx);
            // Mark as drag if movement exceeds small threshold
            if (Math.abs(dx) >= this.DRAG_THRESHOLD) this.wasDragged = true;
            this.animationFrameId = null;
        });
    }

    onPointerUp(ev: PointerEvent, maxIndex: number): number {
        if (!this.isDragging) return this.currentIndex();

        // Cancel any pending animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.isDragging = false;
        const dx = this.deltaX();
        const w = this.slideWidth() || this.containerWidth() || 1;
        const threshold = Math.max(60, w * 0.15);

        let next = this.currentIndex();
        if (dx <= -threshold) next += 1;
        else if (dx >= threshold) next -= 1;

        next = Math.max(0, Math.min(next, maxIndex));
        this.deltaX.set(0);
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

    // Utility methods
    getCarouselTransform(): string {
        const step = this.stepSize() || this.containerWidth();
        const offset = -this.currentIndex() * step + this.deltaX();
        return `translateX(${offset}px)`;
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
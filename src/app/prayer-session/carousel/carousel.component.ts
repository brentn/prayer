import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-carousel',
    imports: [CommonModule],
    templateUrl: './carousel.component.html',
    styleUrl: './carousel.component.css'
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
    @Input() items: any[] = [];
    @Input() currentIndex = 0;
    @Input() viewportHeight = 0;

    @Output() indexChange = new EventEmitter<number>();

    @ViewChild('carousel', { static: false }) carousel?: ElementRef<HTMLDivElement>;
    @ViewChild('track', { static: false }) track?: ElementRef<HTMLDivElement>;

    isDragging = false;
    private startX = 0;
    deltaX = 0;
    containerWidth = 0;
    slideWidth = 0;
    stepSize = 0;
    private readonly peek = 16; // pixels to show next/prev card edges
    private readonly slideGap = 12; // space between slides in px
    private measureRef?: () => void;
    private scrollDebounceId?: any;

    ngAfterViewInit(): void {
        const measure = () => {
            const vp = this.carousel?.nativeElement;
            const w = vp?.clientWidth || window.innerWidth;
            this.containerWidth = w;

            const trackEl = this.track?.nativeElement;
            const slides = trackEl?.querySelectorAll<HTMLElement>('.slide') || [];
            let slideW = w;
            let step = w;
            if (slides.length) {
                const rect0 = slides[0].getBoundingClientRect();
                slideW = rect0.width || w;
                if (slides.length >= 2) {
                    const rect1 = slides[1].getBoundingClientRect();
                    step = Math.abs(rect1.left - rect0.left) || (slideW);
                } else {
                    const styles = trackEl ? getComputedStyle(trackEl) : undefined;
                    const gap = styles ? parseFloat((styles as any).columnGap || (styles as any).gap || '0') : this.slideGap;
                    step = slideW + (isNaN(gap) ? 0 : gap);
                }
            }
            this.slideWidth = slideW;
            this.stepSize = step;
        };
        this.measureRef = measure;
        measure();
        // Re-measure on next frame to capture final layout
        requestAnimationFrame(() => measure());
        window.addEventListener('resize', measure);
    }

    ngOnDestroy(): void {
        if (this.measureRef) window.removeEventListener('resize', this.measureRef);
        if (this.scrollDebounceId) clearTimeout(this.scrollDebounceId);
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            this.setIndex(this.currentIndex - 1);
            event.preventDefault();
        } else if (event.key === 'ArrowRight') {
            this.setIndex(this.currentIndex + 1);
            event.preventDefault();
        }
    }

    onPointerDown(ev: PointerEvent) {
        // Don't start swipe when interacting with sliders or other controls
        const target = ev.target as HTMLElement;
        if (target.closest('mat-slider, button, input')) return;
        this.isDragging = true;
        this.startX = ev.clientX;
        this.deltaX = 0;
    }

    onPointerMove(ev: PointerEvent) {
        if (!this.isDragging) return;
        const dx = ev.clientX - this.startX;
        this.deltaX = dx;
    }

    onPointerUp(ev: PointerEvent) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dx = this.deltaX;
        const w = this.slideWidth || this.containerWidth || 1;
        const threshold = Math.max(60, w * 0.15);
        let next = this.currentIndex;
        if (dx <= -threshold) next += 1;
        else if (dx >= threshold) next -= 1;
        const max = this.items.length; // last slide index == number of items
        next = Math.max(0, Math.min(next, max));
        this.deltaX = 0;
        this.setIndex(next);
    }

    setIndex(idx: number) {
        const clamped = Math.max(0, Math.min(idx, this.items.length));
        if (clamped === this.currentIndex) return;
        this.currentIndex = clamped;
        this.indexChange.emit(clamped);
    }

    carouselTransform(): string {
        const step = this.stepSize || this.containerWidth;
        const offset = -this.currentIndex * step + this.deltaX;
        return `translateX(${offset}px)`;
    }

    get totalSlides(): number {
        return this.items.length;
    }

    get currentSlide(): number {
        if (this.currentIndex < 1) return 0;
        return Math.min(this.currentIndex, this.totalSlides);
    }
}
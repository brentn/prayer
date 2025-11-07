import { Component, Input, Output, EventEmitter, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { PrayerSessionService } from '../../shared/services/prayer-session.service';
import { SettingsService } from '../../shared/services/settings.service';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatSliderModule],
    templateUrl: './settings-card.component.html',
    styleUrl: './settings-card.component.css'
})
export class SettingsCardComponent {
    private prayerSessionService = inject(PrayerSessionService);
    private settings = inject(SettingsService);

    @Input() answeredValue: number = 0;
    @Input() selectCount: number = 0;
    @Input() timeValue: number = 60;

    @Output() answeredValueChange = new EventEmitter<number>();
    @Output() selectCountChange = new EventEmitter<number>();
    @Output() timeChange = new EventEmitter<number>();

    // Computed properties for slider bounds
    maxSelectable = computed(() => this.prayerSessionService.getMaxSelectable());
    safeMaxSelectable = computed(() => this.prayerSessionService.getSafeMaxSelectable());
    maxAnswered = computed(() => this.prayerSessionService.getMaxAnswered());

    // Getters and setters for two-way binding
    get answeredValueModel(): number {
        return this.answeredValue;
    }

    set answeredValueModel(value: number) {
        this.answeredValue = value;
        this.answeredValueChange.emit(value);
    }

    get selectCountModel(): number {
        return this.selectCount;
    }

    set selectCountModel(value: number) {
        this.selectCount = value;
        this.selectCountChange.emit(value);
    }

    get timeValueModel(): number {
        return this.timeValue;
    }

    set timeValueModel(value: number) {
        this.timeValue = value;
        this.timeChange.emit(value);
    }

    // Label formatters
    formatAnsweredLabel(): string {
        const value = this.answeredValue;
        if (value === 0) return 'None';
        return String(value);
    }

    formatCountLabel(): string {
        const max = this.maxSelectable();
        const value = this.selectCount;
        return value >= max ? 'All items' : String(value);
    }

    formatTimeLabel(): string {
        const value = this.timeValue;
        if (value >= 61) return 'Unlimited';
        return `${value} min`;
    }
}
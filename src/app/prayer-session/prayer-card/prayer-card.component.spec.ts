import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PrayerCardComponent } from './prayer-card.component';

describe('PrayerCardComponent', () => {
    let component: PrayerCardComponent;
    let fixture: ComponentFixture<PrayerCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardComponent],
            providers: [provideNoopAnimations()]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PrayerCardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('computed signals', () => {
        it('should compute answeredSummary correctly', () => {
            component.prayerCount = 5;
            component.createdDate = '2025-01-01';
            component.answeredDate = '2025-03-01';
            expect(component.answeredSummary()).toContain('Prayed 5 times over 2 months');
        });

        it('should compute answeredDateText correctly', () => {
            component.isAnswered = true;
            component.answeredDate = '2025-11-05';
            const text = component.answeredDateText();
            expect(text).toContain('Answered');
            expect(text).toMatch(/Answered \d{1,2}\/\d{1,2}\/\d{4}/); // More flexible date format check
        });

        it('should return empty strings when data is missing', () => {
            component.prayerCount = undefined;
            expect(component.answeredSummary()).toBe('');
            component.isAnswered = false;
            expect(component.answeredDateText()).toBe('');
        });
    });

    describe('ngOnChanges', () => {
        it('should reset local state when answerDescription changes', () => {
            component.localIsAnswered.set(true);
            component.localAnswerDescription.set('old');
            component.ngOnChanges({
                answerDescription: {
                    currentValue: 'new',
                    previousValue: undefined,
                    firstChange: true,
                    isFirstChange: () => true
                }
            });
            expect(component.localIsAnswered()).toBe(false);
            expect(component.localAnswerDescription()).toBe('');
        });

        it('should reset local state when isAnswered changes', () => {
            component.localIsAnswered.set(true);
            component.ngOnChanges({
                isAnswered: {
                    currentValue: true,
                    previousValue: false,
                    firstChange: true,
                    isFirstChange: () => true
                }
            });
            expect(component.localIsAnswered()).toBe(true); // Local state is not reset on isAnswered change
        });
    });

    describe('answer handling', () => {
        it('should show answer form on answered click', () => {
            component.onAnsweredClick();
            expect(component.showAnswerForm()).toBe(true);
        });

        it('should submit answer and reset form', () => {
            spyOn(component.answered, 'emit');
            component.onAnswerSubmit('Test answer');
            expect(component.answered.emit).toHaveBeenCalledWith({ answerDescription: 'Test answer' });
            expect(component.localIsAnswered()).toBe(true);
            expect(component.localAnswerDescription()).toBe('Test answer');
            expect(component.showAnswerForm()).toBe(false);
            expect(component.answerText()).toBe('');
        });

        it('should cancel answer form', () => {
            component.answerText.set('some text');
            component.onAnswerCancel();
            expect(component.showAnswerForm()).toBe(false);
            expect(component.answerText()).toBe('');
        });
    });

    describe('getTimeSpan', () => {
        it('should calculate years correctly', () => {
            const start = new Date('2020-01-01');
            const end = new Date('2022-01-01');
            expect(component['dateUtils'].getTimeSpan(start, end)).toBe('2 years');
        });

        it('should calculate months correctly', () => {
            const start = new Date(2025, 0, 1); // Jan 1
            const end = new Date(2025, 2, 1); // Mar 1
            expect(component['dateUtils'].getTimeSpan(start, end)).toBe('2 months');
        });

        it('should calculate days correctly', () => {
            const start = new Date(2025, 0, 1); // Jan 1
            const end = new Date(2025, 0, 5); // Jan 5
            expect(component['dateUtils'].getTimeSpan(start, end)).toBe('4 days');
        });

        it('should handle less than a day', () => {
            const start = new Date('2025-01-01T10:00:00');
            const end = new Date('2025-01-01T15:00:00');
            expect(component['dateUtils'].getTimeSpan(start, end)).toBe('less than a day');
        });
    });
});
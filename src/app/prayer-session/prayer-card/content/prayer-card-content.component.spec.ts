import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PrayerCardContentComponent } from './prayer-card-content.component';

describe('PrayerCardContentComponent', () => {
    let component: PrayerCardContentComponent;
    let fixture: ComponentFixture<PrayerCardContentComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrayerCardContentComponent],
            providers: [provideNoopAnimations()]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PrayerCardContentComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('icon display', () => {
        it('should display the icon', () => {
            component.icon = 'favorite';
            fixture.detectChanges();
            const icon = fixture.debugElement.query(By.css('.card-icon'));
            expect(icon.nativeElement.textContent.trim()).toBe('favorite');
        });
    });

    describe('topic display', () => {
        it('should show topic when topicName is provided', () => {
            component.topicName = 'Healing';
            fixture.detectChanges();
            const topic = fixture.debugElement.query(By.css('.card-topic'));
            expect(topic.nativeElement.textContent.trim()).toBe('Healing:');
        });

        it('should hide topic when topicName is not provided', () => {
            component.topicName = undefined;
            fixture.detectChanges();
            const topic = fixture.debugElement.query(By.css('.card-topic'));
            expect(topic).toBeFalsy();
        });
    });

    describe('title display', () => {
        it('should display the title', () => {
            component.title = 'Pray for healing';
            fixture.detectChanges();
            const title = fixture.debugElement.query(By.css('.card-title'));
            expect(title.nativeElement.textContent.trim()).toBe('Pray for healing');
        });
    });

    describe('answer description', () => {
        it('should show answer description when answered and description exists', () => {
            component.isAnswered = true;
            component.localIsAnswered = false;
            component.answerDescription = 'God healed me completely!';
            component.localAnswerDescription = '';
            fixture.detectChanges();
            const desc = fixture.debugElement.query(By.css('.answer-description-box'));
            expect(desc.nativeElement.textContent.trim()).toBe('God healed me completely!');
        });

        it('should show local answer description when using local state', () => {
            component.isAnswered = false;
            component.localIsAnswered = true;
            component.answerDescription = '';
            component.localAnswerDescription = 'Answered locally';
            fixture.detectChanges();
            const desc = fixture.debugElement.query(By.css('.answer-description-box'));
            expect(desc.nativeElement.textContent.trim()).toBe('Answered locally');
        });

        it('should hide answer description when not answered', () => {
            component.isAnswered = false;
            component.localIsAnswered = false;
            component.answerDescription = 'Some answer';
            fixture.detectChanges();
            const desc = fixture.debugElement.query(By.css('.answer-description-box'));
            expect(desc).toBeFalsy();
        });

        it('should hide answer description when no description', () => {
            component.isAnswered = true;
            component.answerDescription = '';
            component.localAnswerDescription = '';
            fixture.detectChanges();
            const desc = fixture.debugElement.query(By.css('.answer-description-box'));
            expect(desc).toBeFalsy();
        });
    });
});
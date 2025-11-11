import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
    standalone: true,
    selector: 'app-prayer-card-content',
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './prayer-card-content.component.html',
    styleUrl: './prayer-card-content.component.css',
    animations: [
        trigger('answerFadeIn', [
            transition('void => *', [
                style({ opacity: 0, transform: 'translateY(-10px)' }),
                animate('350ms 200ms cubic-bezier(0.4, 0.0, 0.2, 1)') // Start after form begins closing
            ])
        ])
    ]
})
export class PrayerCardContentComponent {
    @Input() icon = 'favorite';
    @Input() title = '';
    @Input() topicName?: string;
    @Input() isAnswered = false;
    @Input() localIsAnswered = false;
    @Input() answerDescription?: string;
    @Input() localAnswerDescription = '';
    @Input() onAnsweredClick?: () => void;
    @Input() showAnswerForm = false;
    @Input() isTopic = false;
    @Output() archive = new EventEmitter<void>();
}
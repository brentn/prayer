import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
    standalone: true,
    selector: 'app-answer-form',
    imports: [CommonModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, TextFieldModule],
    templateUrl: './answer-form.component.html',
    styleUrl: './answer-form.component.css',
    animations: [
        trigger('slideInOut', [
            state('in', style({ height: '*', opacity: 1, transform: 'translateY(0)' })),
            transition('void => *', [
                style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }),
                animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)')
            ]),
            transition('* => void', [
                animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                    style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }))
            ])
        ])
    ]
})
export class AnswerFormComponent {
    @Input() showAnswerForm = signal(false);
    @Input() answerText = signal('');
    @Input() onAnswerSubmit!: (text: string) => void;
    @Input() onAnswerCancel!: () => void;

    onSubmit() {
        if (this.answerText().trim()) {
            const trimmed = this.answerText().trim();
            this.onAnswerSubmit(trimmed);
            this.showAnswerForm.set(false);
            this.answerText.set('');
        }
    }

    onCancel() {
        this.showAnswerForm.set(false);
        this.answerText.set('');
    }
}
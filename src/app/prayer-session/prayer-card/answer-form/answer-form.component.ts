import { Component, Input, Output, EventEmitter, signal, input, OnInit, OnChanges, ChangeDetectionStrategy, Signal, WritableSignal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
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
export class AnswerFormComponent implements OnInit, OnChanges {
    showAnswerForm = input.required<WritableSignal<boolean>>();
    answerText = input.required<WritableSignal<string>>();
    dialogOpen = input.required<boolean>();
    onAnswerSubmit = input.required<(text: string) => void>();
    onAnswerCancel = input.required<() => void>();
    @Output() openAnswerDialog = new EventEmitter<void>();

    ngOnInit() {
        // When the form should be shown and dialog is not open, emit event to open dialog
        if (this.showAnswerForm()() && !this.dialogOpen()) {
            this.openAnswerDialog.emit();
        }
    }

    ngOnChanges() {
        // When showAnswerForm becomes true and dialog is not open, emit event to open dialog
        if (this.showAnswerForm()() && !this.dialogOpen()) {
            this.openAnswerDialog.emit();
        }
    }

    onCancel() {
        this.onAnswerCancel()();
    }

    onSave() {
        const trimmed = this.answerText()().trim();
        if (trimmed) {
            this.onAnswerSubmit()(trimmed);
        }
    }
}
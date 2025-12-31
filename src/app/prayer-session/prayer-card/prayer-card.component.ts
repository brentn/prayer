import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PrayerCardContentComponent } from './content/prayer-card-content.component';
import { PrayerSessionItem } from '../../shared/models/prayer-session.interface';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, PrayerCardContentComponent],
    templateUrl: './prayer-card.component.html',
    styleUrl: './prayer-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrayerCardComponent {
    @Input() item!: PrayerSessionItem;
    // Topic-only actions
    @Output() titleEdited = new EventEmitter<string>();
    @Output() addNewRequest = new EventEmitter<{ topicName: string; description: string }>();
    @Output() requestAnswered = new EventEmitter<{ id: number; answerDescription: string }>();
    @Output() requestArchived = new EventEmitter<{ id: number }>();
    @Output() requestTitleEdited = new EventEmitter<{ id: number; title: string }>();
    @Output() requestAnswerAdd = new EventEmitter<{ id: number; title: string }>();

    showDialog = signal(false);
    newRequestText = signal('');

    get title() { return this.item.kind === 'topic' ? this.item.name : ''; }
    get listName() { return this.item.listName; }
    get topicId() { return this.item.kind === 'topic' ? this.item.id : undefined; }

    onNewRequest() {
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
        this.newRequestText.set('');
    }

    onSave() {
        const desc = this.newRequestText().trim();
        if (desc) {
            this.addNewRequest.emit({ topicName: this.title, description: desc });
            this.closeDialog();
        }
    }
}

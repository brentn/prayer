import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DateUtilsService } from '../../../shared/services/date-utils.service';
import { PrayerSessionItem } from '../../../shared/models/prayer-session.interface';

@Component({
    standalone: true,
    selector: 'app-answer-card',
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
    templateUrl: './answer-card.component.html',
    styleUrl: './answer-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnswerCardComponent {
    private readonly dateUtils = inject(DateUtilsService);

    @Input() item!: Extract<PrayerSessionItem, { kind: 'request' }>;

    title = computed(() => this.item?.description ?? '');
    topicName = computed(() => this.item?.topicName ?? '');
    listName = computed(() => this.item?.listName ?? '');
    answeredSummary = computed(() => this.dateUtils.formatAnsweredSummary(this.item?.prayerCount, this.item?.createdDate, this.item?.answeredDate));
    answeredDateText = computed(() => this.dateUtils.formatAnsweredDateText(Boolean(this.item?.isAnswered), this.item?.answeredDate));
}
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    standalone: true,
    selector: 'app-prayer-card',
    imports: [CommonModule, MatIconModule],
    templateUrl: './prayer-card.component.html',
    styleUrl: './prayer-card.component.css'
})
export class PrayerCardComponent {
    @Input() icon: string = 'favorite';
    @Input() title: string = '';
    @Input() subtitle?: string;
}

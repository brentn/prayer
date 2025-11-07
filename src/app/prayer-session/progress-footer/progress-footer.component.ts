import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
    standalone: true,
    selector: 'app-progress-footer',
    imports: [CommonModule, MatProgressBarModule],
    templateUrl: './progress-footer.component.html',
    styleUrl: './progress-footer.component.css'
})
export class ProgressFooterComponent {
    @Input() visible = false;
    @Input() unlimited = false;
    @Input() progressPercent = 0;
    @Input() timeProgressPercent = 0;

    formatRemaining(): string {
        // This would need to be passed in or computed from time data
        // For now, return a placeholder
        return this.unlimited ? 'Unlimited' : 'Calculating...';
    }
}
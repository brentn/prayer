import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { SettingsService } from '../shared/services/settings.service';

@Component({
    standalone: true,
    imports: [CommonModule, MatSlideToggleModule, MatListModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    private settings = inject(SettingsService);

    keepAwake() { return this.settings.keepAwake(); }
    toggleKeepAwake(ev: any) { this.settings.setKeepAwake(!!ev.checked); }
}

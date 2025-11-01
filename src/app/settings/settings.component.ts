import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SettingsService } from '../shared/services/settings.service';
import { Router } from '@angular/router';

@Component({
    standalone: true,
    imports: [CommonModule, MatListModule, MatCheckboxModule, MatIconModule, MatButtonModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    private settings = inject(SettingsService);
    private router = inject(Router);

    keepAwake() { return this.settings.keepAwake(); }
    toggleKeepAwake(ev: any) { this.settings.setKeepAwake(!!ev.checked); }

    shuffleRequests() { return this.settings.shuffleRequests(); }
    toggleShuffleRequests(ev: any) { this.settings.setShuffleRequests(!!ev.checked); }

    close() { this.router.navigate(['/']); }
}
